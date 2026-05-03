#include <cerrno>
#include <chrono>
#include <csignal>
#include <cstring>
#include <filesystem>
#include <fcntl.h>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <sys/select.h>
#include <termios.h>
#include <unistd.h>
#include <vector>

namespace fs = std::filesystem;

struct Options {
    std::string device;
    int baud = 115200;
    bool list = false;
    bool probe = true;
    bool voice_init = false;
    bool hangup = true;
    int command_timeout_ms = 3000;
    int dial_seconds = 20;
    std::string number;
    std::vector<std::string> commands;
};

static void usage(const char* argv0)
{
    std::cout
        << "Usage:\n"
        << "  " << argv0 << " --list\n"
        << "  " << argv0 << " --device /dev/ttyUSB0 [--baud 115200] [--probe]\n"
        << "  " << argv0 << " --device /dev/ttyUSB0 --number 5551212 [--dial-seconds 20]\n"
        << "\n"
        << "Options:\n"
        << "  --list                 List likely serial modem devices.\n"
        << "  --device PATH          Serial device, for example /dev/ttyUSB0.\n"
        << "  --baud N               Baud rate. Supported: 9600, 19200, 38400, 57600, 115200.\n"
        << "  --no-probe             Skip the default AT/ATI/FCLASS probe commands.\n"
        << "  --voice-init           Send AT+FCLASS=8 before dialing, if the modem supports voice mode.\n"
        << "  --number NUMBER        Dial NUMBER as a voice call using ATD<number>;.\n"
        << "  --dial-seconds N       Seconds to leave the call up before hangup. Default: 20.\n"
        << "  --no-hangup            Do not send ATH after dialing.\n"
        << "  --command AT...        Send an extra AT command. May be repeated.\n"
        << "  --timeout-ms N         Per-command response timeout. Default: 3000.\n";
}

static std::optional<speed_t> baud_to_speed(int baud)
{
    switch (baud) {
    case 9600: return B9600;
    case 19200: return B19200;
    case 38400: return B38400;
    case 57600: return B57600;
    case 115200: return B115200;
    default: return std::nullopt;
    }
}

static bool starts_with(const std::string& s, const std::string& prefix)
{
    return s.rfind(prefix, 0) == 0;
}

static std::vector<std::string> find_candidates()
{
    std::vector<std::string> out;
    const std::vector<std::string> prefixes = {
        "ttyUSB", "ttyACM", "ttyS", "ttyAMA", "ttyTHS"
    };

    std::error_code ec;
    if (fs::exists("/dev/modem", ec)) out.push_back("/dev/modem");

    for (const auto& entry : fs::directory_iterator("/dev", ec)) {
        if (ec) break;
        const std::string name = entry.path().filename().string();
        for (const auto& prefix : prefixes) {
            if (starts_with(name, prefix)) {
                out.push_back(entry.path().string());
                break;
            }
        }
    }
    return out;
}

static bool parse_args(int argc, char** argv, Options& opt)
{
    for (int i = 1; i < argc; ++i) {
        std::string a = argv[i];
        auto need_value = [&](const char* name) -> std::optional<std::string> {
            if (i + 1 >= argc) {
                std::cerr << name << " requires a value\n";
                return std::nullopt;
            }
            return std::string(argv[++i]);
        };

        if (a == "--help" || a == "-h") {
            usage(argv[0]);
            std::exit(0);
        } else if (a == "--list") {
            opt.list = true;
        } else if (a == "--device") {
            auto v = need_value("--device");
            if (!v) return false;
            opt.device = *v;
        } else if (a == "--baud") {
            auto v = need_value("--baud");
            if (!v) return false;
            opt.baud = std::stoi(*v);
        } else if (a == "--number") {
            auto v = need_value("--number");
            if (!v) return false;
            opt.number = *v;
        } else if (a == "--dial-seconds") {
            auto v = need_value("--dial-seconds");
            if (!v) return false;
            opt.dial_seconds = std::stoi(*v);
        } else if (a == "--timeout-ms") {
            auto v = need_value("--timeout-ms");
            if (!v) return false;
            opt.command_timeout_ms = std::stoi(*v);
        } else if (a == "--command") {
            auto v = need_value("--command");
            if (!v) return false;
            opt.commands.push_back(*v);
        } else if (a == "--no-probe") {
            opt.probe = false;
        } else if (a == "--voice-init") {
            opt.voice_init = true;
        } else if (a == "--no-hangup") {
            opt.hangup = false;
        } else {
            std::cerr << "Unknown option: " << a << "\n";
            return false;
        }
    }
    return true;
}

class SerialPort {
public:
    ~SerialPort()
    {
        if (fd_ >= 0) close(fd_);
    }

    bool open_port(const std::string& path, int baud, std::string& err)
    {
        auto speed = baud_to_speed(baud);
        if (!speed) {
            err = "unsupported baud rate";
            return false;
        }

        fd_ = open(path.c_str(), O_RDWR | O_NOCTTY | O_NONBLOCK);
        if (fd_ < 0) {
            err = std::strerror(errno);
            return false;
        }

        termios tio {};
        if (tcgetattr(fd_, &tio) != 0) {
            err = std::strerror(errno);
            return false;
        }

        cfmakeraw(&tio);
        cfsetispeed(&tio, *speed);
        cfsetospeed(&tio, *speed);
        tio.c_cflag |= static_cast<unsigned int>(CLOCAL | CREAD);
        tio.c_cflag &= static_cast<unsigned int>(~PARENB);
        tio.c_cflag &= static_cast<unsigned int>(~CSTOPB);
        tio.c_cflag &= static_cast<unsigned int>(~CSIZE);
        tio.c_cflag |= CS8;
        tio.c_cflag &= static_cast<unsigned int>(~CRTSCTS);
        tio.c_iflag &= static_cast<unsigned int>(~(IXON | IXOFF | IXANY));
        tio.c_cc[VMIN] = 0;
        tio.c_cc[VTIME] = 0;

        if (tcsetattr(fd_, TCSANOW, &tio) != 0) {
            err = std::strerror(errno);
            return false;
        }

        tcflush(fd_, TCIOFLUSH);
        return true;
    }

    bool write_all(const std::string& data, std::string& err)
    {
        size_t off = 0;
        while (off < data.size()) {
            ssize_t n = write(fd_, data.data() + off, data.size() - off);
            if (n > 0) {
                off += static_cast<size_t>(n);
                continue;
            }
            if (n < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
                usleep(10000);
                continue;
            }
            err = std::strerror(errno);
            return false;
        }
        tcdrain(fd_);
        return true;
    }

    std::string read_for(int timeout_ms)
    {
        std::string out;
        const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeout_ms);

        while (std::chrono::steady_clock::now() < deadline) {
            auto remain = std::chrono::duration_cast<std::chrono::milliseconds>(
                deadline - std::chrono::steady_clock::now()).count();
            timeval tv {};
            tv.tv_sec = static_cast<int>(remain / 1000);
            tv.tv_usec = static_cast<int>((remain % 1000) * 1000);

            fd_set set;
            FD_ZERO(&set);
            FD_SET(fd_, &set);
            int rc = select(fd_ + 1, &set, nullptr, nullptr, &tv);
            if (rc > 0 && FD_ISSET(fd_, &set)) {
                char buf[512];
                ssize_t n = read(fd_, buf, sizeof(buf));
                if (n > 0) out.append(buf, static_cast<size_t>(n));
            } else if (rc == 0) {
                break;
            } else if (rc < 0 && errno != EINTR) {
                break;
            }
        }
        return out;
    }

private:
    int fd_ = -1;
};

static std::string printable(const std::string& raw)
{
    std::ostringstream os;
    for (char c : raw) {
        if (c == '\r') continue;
        if (c == '\n') os << '\n';
        else if (static_cast<unsigned char>(c) >= 32 && static_cast<unsigned char>(c) < 127) os << c;
        else os << '.';
    }
    return os.str();
}

static bool send_command(SerialPort& port, const std::string& command, int timeout_ms)
{
    std::string err;
    std::cout << "\n> " << command << "\n";
    if (!port.write_all(command + "\r", err)) {
        std::cerr << "write failed: " << err << "\n";
        return false;
    }

    const std::string response = port.read_for(timeout_ms);
    if (response.empty()) {
        std::cout << "(no response before timeout)\n";
        return false;
    }

    std::cout << printable(response) << "\n";
    return response.find("OK") != std::string::npos ||
           response.find("CONNECT") != std::string::npos ||
           response.find("VCON") != std::string::npos;
}

int main(int argc, char** argv)
{
    Options opt;
    if (!parse_args(argc, argv, opt)) {
        usage(argv[0]);
        return 2;
    }

    if (opt.list) {
        auto candidates = find_candidates();
        if (candidates.empty()) {
            std::cout << "No likely modem serial devices found under /dev.\n";
        } else {
            for (const auto& path : candidates) std::cout << path << "\n";
        }
        if (opt.device.empty()) return 0;
    }

    if (opt.device.empty()) {
        std::cerr << "--device is required unless only --list is used\n";
        usage(argv[0]);
        return 2;
    }

    SerialPort port;
    std::string err;
    if (!port.open_port(opt.device, opt.baud, err)) {
        std::cerr << "Failed to open " << opt.device << ": " << err << "\n";
        return 1;
    }

    std::cout << "Opened " << opt.device << " at " << opt.baud << " baud.\n";

    bool ok = true;
    if (opt.probe) {
        ok = send_command(port, "AT", opt.command_timeout_ms) && ok;
        ok = send_command(port, "ATE1", opt.command_timeout_ms) && ok;
        send_command(port, "ATI", opt.command_timeout_ms);
        send_command(port, "AT+FCLASS=?", opt.command_timeout_ms);
    }

    for (const auto& command : opt.commands) {
        ok = send_command(port, command, opt.command_timeout_ms) && ok;
    }

    if (opt.voice_init) {
        ok = send_command(port, "AT+FCLASS=8", opt.command_timeout_ms) && ok;
    }

    if (!opt.number.empty()) {
        std::cout << "\nDialing " << opt.number << " as a voice call.\n";
        send_command(port, "ATD" + opt.number + ";", opt.command_timeout_ms);

        if (opt.dial_seconds > 0) {
            std::cout << "Waiting " << opt.dial_seconds << " seconds before hangup.\n";
            sleep(static_cast<unsigned int>(opt.dial_seconds));
        }

        if (opt.hangup) {
            std::cout << "\nHanging up.\n";
            send_command(port, "ATH", opt.command_timeout_ms);
        }
    }

    return ok ? 0 : 1;
}
