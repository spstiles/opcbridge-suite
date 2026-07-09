#include <atomic>
#include <algorithm>
#include <array>
#include <cerrno>
#include <chrono>
#include <cctype>
#include <cstdio>
#include <condition_variable>
#include <cstdint>
#include <cstdlib>
#include <deque>
#include <filesystem>
#include <fcntl.h>
#include <fstream>
#include <functional>
#include <iostream>
#include <ifaddrs.h>
#include <cstring>
#include <ctime>
#include <limits>
#include <mutex>
#include <net/if.h>
#include <optional>
#include <arpa/inet.h>
#include <random>
#include <string>
#include <sys/select.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <termios.h>
#include <sstream>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <unistd.h>
#include <vector>
#include <pty.h>

#include "../httplib.h"
#include <ixwebsocket/IXWebSocket.h>
#include <ixwebsocket/IXWebSocketServer.h>
#include <nlohmann/json.hpp>
#include <sqlite3.h>

#if defined(OPCBRIDGE_HAVE_PJSUA2)
#include <pjsua2.hpp>
#endif

// Version info (wired in via build.sh)
#ifndef OPCBRIDGE_ALARMS_VERSION
#define OPCBRIDGE_ALARMS_VERSION "dev"
#endif
#ifndef OPCBRIDGE_SUITE_VERSION
#define OPCBRIDGE_SUITE_VERSION "dev"
#endif

extern "C" {
#if defined(__clang__)
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wunused-parameter"
#elif defined(__GNUC__)
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
#endif
#include "open62541.h"
#if defined(__clang__)
#pragma clang diagnostic pop
#elif defined(__GNUC__)
#pragma GCC diagnostic pop
#endif
}

using json = nlohmann::json;
using ix::WebSocketServer;

static int64_t now_ms()
{
    return std::chrono::duration_cast<std::chrono::milliseconds>(
               std::chrono::system_clock::now().time_since_epoch())
        .count();
}

static std::string random_hex(size_t bytes)
{
    static thread_local std::mt19937_64 rng{std::random_device{}()};
    std::uniform_int_distribution<uint32_t> dist(0, 255);
    static const char* hex = "0123456789abcdef";
    std::string out;
    out.reserve(bytes * 2);
    for (size_t i = 0; i < bytes; i++)
    {
        uint8_t b = static_cast<uint8_t>(dist(rng));
        out.push_back(hex[(b >> 4) & 0x0F]);
        out.push_back(hex[b & 0x0F]);
    }
    return out;
}

static std::string read_file(const std::string &path)
{
    std::ifstream ifs(path);
    if (!ifs) throw std::runtime_error("Failed to open file: " + path);
    return std::string((std::istreambuf_iterator<char>(ifs)),
                       std::istreambuf_iterator<char>());
}

static std::string join_path(const std::string& a, const std::string& b)
{
    if (a.empty()) return b;
    if (b.empty()) return a;
    if (!b.empty() && b.front() == '/') return b;
    if (a.back() == '/') return a + b;
    return a + "/" + b;
}

static std::string shell_quote(const std::string& value)
{
    std::string out = "'";
    for (char ch : value)
    {
        if (ch == '\'') out += "'\\''";
        else out.push_back(ch);
    }
    out += "'";
    return out;
}

static std::string exec_capture(const std::string& cmd, int& exit_code, size_t max_bytes = 256 * 1024)
{
    exit_code = -1;
    std::string out;
    FILE* fp = popen(cmd.c_str(), "r");
    if (!fp)
    {
        exit_code = 127;
        return "";
    }
    char buf[4096];
    while (!feof(fp))
    {
        const size_t n = fread(buf, 1, sizeof(buf), fp);
        if (n == 0) break;
        if (out.size() + n > max_bytes)
        {
            const size_t avail = max_bytes > out.size() ? (max_bytes - out.size()) : 0;
            if (avail > 0) out.append(buf, buf + avail);
            break;
        }
        out.append(buf, buf + n);
    }
    const int rc = pclose(fp);
    if (WIFEXITED(rc)) exit_code = WEXITSTATUS(rc);
    else if (WIFSIGNALED(rc)) exit_code = 128 + WTERMSIG(rc);
    else exit_code = rc;
    return out;
}

static std::string detect_route_interface_for_host(const std::string& host)
{
    if (host.empty()) return "";
    int rc = 0;
    const std::string cmd = "ip route get " + shell_quote(host) + " 2>/dev/null";
    const std::string out = exec_capture(cmd, rc, 32 * 1024);
    if (rc != 0 || out.empty()) return "";
    // Example: "10.20.30.162 via 172.22.44.60 dev tun1 src 172.18.0.65 uid 1000"
    const std::string needle = " dev ";
    const size_t pos = out.find(needle);
    if (pos == std::string::npos) return "";
    size_t start = pos + needle.size();
    while (start < out.size() && out[start] == ' ') start++;
    size_t end = start;
    while (end < out.size() && out[end] != ' ' && out[end] != '\n' && out[end] != '\r' && out[end] != '\t') end++;
    if (end <= start) return "";
    return out.substr(start, end - start);
}

[[maybe_unused]] static std::vector<int> sip_response_codes(const std::string& log)
{
    std::vector<int> codes;
    auto strip_ansi = [](const std::string& s) -> std::string {
        std::string out;
        out.reserve(s.size());
        for (size_t i = 0; i < s.size(); ++i)
        {
            const unsigned char c = static_cast<unsigned char>(s[i]);
            if (c == 0x1B) // ESC
            {
                // Skip ANSI CSI: ESC [ ... letter
                if ((i + 1) < s.size() && s[i + 1] == '[')
                {
                    i += 2;
                    while (i < s.size())
                    {
                        const unsigned char cc = static_cast<unsigned char>(s[i]);
                        if ((cc >= 'A' && cc <= 'Z') || (cc >= 'a' && cc <= 'z')) break;
                        ++i;
                    }
                    continue;
                }
                continue;
            }
            out.push_back(static_cast<char>(c));
        }
        return out;
    };

    size_t pos = 0;
    while (pos < log.size())
    {
        const size_t lineEnd = log.find('\n', pos);
        const size_t len = (lineEnd == std::string::npos) ? (log.size() - pos) : (lineEnd - pos);
        std::string line = log.substr(pos, len);
        line = strip_ansi(line);

        const size_t p0 = line.find("SIP/2.0");
        if (p0 != std::string::npos)
        {
            size_t p = p0 + 8;
            while (p < line.size() && (line[p] == ' ' || line[p] == '\t')) p++;
            int code = 0;
            int digits = 0;
            while (p < line.size() && digits < 3 && std::isdigit(static_cast<unsigned char>(line[p])))
            {
                code = code * 10 + (line[p] - '0');
                digits++;
                p++;
            }
            if (digits == 3) codes.push_back(code);
        }

        if (lineEnd == std::string::npos) break;
        pos = lineEnd + 1;
    }
    std::sort(codes.begin(), codes.end());
    codes.erase(std::unique(codes.begin(), codes.end()), codes.end());
    return codes;
}

struct SipMethodStats
{
    std::vector<int> codes;
    bool req_tx = false;
    bool req_rx = false;
};

struct SipLogParsed
{
    std::string local_ip;
    std::unordered_map<std::string, SipMethodStats> methods;
};

static SipLogParsed sip_parse_log(const std::string& rawLog)
{
    auto strip_ansi = [](const std::string& s) -> std::string {
        std::string out;
        out.reserve(s.size());
        for (size_t i = 0; i < s.size(); ++i)
        {
            const unsigned char c = static_cast<unsigned char>(s[i]);
            if (c == 0x1B)
            {
                if ((i + 1) < s.size() && s[i + 1] == '[')
                {
                    i += 2;
                    while (i < s.size())
                    {
                        const unsigned char cc = static_cast<unsigned char>(s[i]);
                        if ((cc >= 'A' && cc <= 'Z') || (cc >= 'a' && cc <= 'z')) break;
                        ++i;
                    }
                    continue;
                }
                continue;
            }
            out.push_back(static_cast<char>(c));
        }
        return out;
    };

    const std::string log = strip_ansi(rawLog);
    SipLogParsed parsed;

    auto add_code = [&](const std::string& method, int code) {
        if (method.empty() || code <= 0) return;
        auto& st = parsed.methods[method];
        st.codes.push_back(code);
    };
    auto mark_req = [&](const std::string& method, bool tx, bool rx) {
        if (method.empty()) return;
        auto& st = parsed.methods[method];
        if (tx) st.req_tx = true;
        if (rx) st.req_rx = true;
    };

    // Determine local IP (best-effort) from: "Local network address:  IPv4=tun1|172.18.0.65"
    {
        const std::string needle = "Local network address:";
        const size_t p = log.find(needle);
        if (p != std::string::npos)
        {
            const size_t eol = log.find('\n', p);
            const std::string line = (eol == std::string::npos) ? log.substr(p) : log.substr(p, eol - p);
            const size_t ipv4 = line.find("IPv4=");
            if (ipv4 != std::string::npos)
            {
                const size_t bar = line.find('|', ipv4);
                if (bar != std::string::npos)
                {
                    size_t start = bar + 1;
                    while (start < line.size() && line[start] == ' ') start++;
                    size_t end = start;
                    while (end < line.size() && (std::isdigit(static_cast<unsigned char>(line[end])) || line[end] == '.')) end++;
                    if (end > start) parsed.local_ip = line.substr(start, end - start);
                }
            }
        }
    }

    enum class Dir { Unknown, Tx, Rx };
    Dir curDir = Dir::Unknown;

    auto dir_from_udp = [&](const std::string& udpLine) -> Dir {
        // "UDP <src> -> <dst>"
        const size_t arrow = udpLine.find(" -> ");
        if (arrow == std::string::npos) return Dir::Unknown;
        const std::string left = udpLine.substr(4, arrow - 4);
        const std::string right = udpLine.substr(arrow + 4);
        auto ip_of = [](const std::string& ep) -> std::string {
            const size_t colon = ep.find(':');
            return colon == std::string::npos ? ep : ep.substr(0, colon);
        };
        const std::string srcIp = ip_of(left);
        const std::string dstIp = ip_of(right);
        if (!parsed.local_ip.empty())
        {
            if (srcIp == parsed.local_ip) return Dir::Tx;
            if (dstIp == parsed.local_ip) return Dir::Rx;
        }
        return Dir::Unknown;
    };

    // Parse SIP messages by blank-line separation after a UDP marker.
    bool inMsg = false;
    bool isResponse = false;
    int respCode = 0;
    std::string cseqMethod;
    std::string firstMethod;

    auto flush_msg = [&]() {
        if (!inMsg) return;
        if (!firstMethod.empty())
        {
            mark_req(firstMethod, curDir == Dir::Tx, curDir == Dir::Rx);
        }
        if (isResponse && respCode > 0 && !cseqMethod.empty())
        {
            add_code(cseqMethod, respCode);
        }
        inMsg = false;
        isResponse = false;
        respCode = 0;
        cseqMethod.clear();
        firstMethod.clear();
    };

    size_t pos = 0;
    while (pos < log.size())
    {
        const size_t lineEnd = log.find('\n', pos);
        std::string line = (lineEnd == std::string::npos) ? log.substr(pos) : log.substr(pos, lineEnd - pos);
        if (!line.empty() && line.back() == '\r') line.pop_back();

        if (line.rfind("UDP ", 0) == 0)
        {
            flush_msg();
            curDir = dir_from_udp(line);
        }
        else if (line.empty())
        {
            flush_msg();
        }
        else
        {
            if (!inMsg)
            {
                inMsg = true;
                if (line.rfind("SIP/2.0", 0) == 0)
                {
                    isResponse = true;
                    // SIP/2.0 180 Ringing
                    size_t p = 8;
                    while (p < line.size() && std::isspace(static_cast<unsigned char>(line[p]))) p++;
                    int code = 0;
                    int digits = 0;
                    while (p < line.size() && digits < 3 && std::isdigit(static_cast<unsigned char>(line[p])))
                    {
                        code = code * 10 + (line[p] - '0');
                        digits++;
                        p++;
                    }
                    if (digits == 3) respCode = code;
                }
                else
                {
                    // INVITE sip:... SIP/2.0
                    const size_t sp = line.find(' ');
                    if (sp != std::string::npos)
                    {
                        firstMethod = line.substr(0, sp);
                    }
                }
            }
            else
            {
                if (line.rfind("CSeq:", 0) == 0)
                {
                    // CSeq: 12345 INVITE
                    const size_t sp1 = line.find(' ');
                    if (sp1 != std::string::npos)
                    {
                        const size_t sp2 = line.find(' ', sp1 + 1);
                        if (sp2 != std::string::npos)
                        {
                            cseqMethod = line.substr(sp2 + 1);
                        }
                    }
                }
            }
        }

        if (lineEnd == std::string::npos) break;
        pos = lineEnd + 1;
    }
    flush_msg();

    // Dedupe/sort codes per method
    for (auto& kv : parsed.methods)
    {
        auto& v = kv.second.codes;
        std::sort(v.begin(), v.end());
        v.erase(std::unique(v.begin(), v.end()), v.end());
    }
    return parsed;
}

static bool sip_method_has_code(const SipLogParsed& parsed, const std::string& method, int code)
{
    const auto it = parsed.methods.find(method);
    if (it == parsed.methods.end()) return false;
    const auto& v = it->second.codes;
    return std::find(v.begin(), v.end(), code) != v.end();
}

[[maybe_unused]] static bool sip_method_has_any_code_in_range(const SipLogParsed& parsed, const std::string& method, int lo, int hi)
{
    const auto it = parsed.methods.find(method);
    if (it == parsed.methods.end()) return false;
    for (const int c : it->second.codes)
    {
        if (c >= lo && c <= hi) return true;
    }
    return false;
}

[[maybe_unused]] static std::vector<int> sip_method_codes(const SipLogParsed& parsed, const std::string& method)
{
    const auto it = parsed.methods.find(method);
    if (it == parsed.methods.end()) return {};
    return it->second.codes;
}

[[maybe_unused]] static bool sip_method_req_tx(const SipLogParsed& parsed, const std::string& method)
{
    const auto it = parsed.methods.find(method);
    if (it == parsed.methods.end()) return false;
    return it->second.req_tx;
}

static bool sip_method_req_rx(const SipLogParsed& parsed, const std::string& method)
{
    const auto it = parsed.methods.find(method);
    if (it == parsed.methods.end()) return false;
    return it->second.req_rx;
}

[[maybe_unused]] static std::string sip_run_baresip_call_interactive(
    const std::string& cfgdir,
    const std::string& net_if,
    const std::string& dest,
    int ring_timeout_sec,
    int talk_duration_sec,
    int hard_timeout_sec,
    int& exit_code,
    int64_t& elapsed_ms,
    int64_t* answered_offset_ms = nullptr,
    std::string* stop_reason = nullptr,
    bool ignore_session_closed_for = false,
    int ignore_session_closed_window_ms = 0
)
{
    exit_code = -1;
    elapsed_ms = 0;
    if (answered_offset_ms) *answered_offset_ms = -1;
    if (stop_reason) *stop_reason = "";
    if (cfgdir.empty() || dest.empty()) return "";

    ring_timeout_sec = std::max(5, std::min(600, ring_timeout_sec));
    talk_duration_sec = std::max(5, std::min(600, talk_duration_sec));
    hard_timeout_sec = std::max(10, std::min(1200, hard_timeout_sec));

    int inpipe[2]{-1, -1};
    int outpipe[2]{-1, -1};
    if (pipe(inpipe) != 0) return "";
    if (pipe(outpipe) != 0)
    {
        close(inpipe[0]); close(inpipe[1]);
        return "";
    }

    pid_t pid = fork();
    if (pid < 0)
    {
        close(inpipe[0]); close(inpipe[1]);
        close(outpipe[0]); close(outpipe[1]);
        return "";
    }
    if (pid == 0)
    {
        // Child: connect stdin/stdout/stderr
        dup2(inpipe[0], STDIN_FILENO);
        dup2(outpipe[1], STDOUT_FILENO);
        dup2(outpipe[1], STDERR_FILENO);
        close(inpipe[0]); close(inpipe[1]);
        close(outpipe[0]); close(outpipe[1]);

        std::vector<std::string> args;
        args.push_back("baresip");
        args.push_back("-f");
        args.push_back(cfgdir);
        if (!net_if.empty())
        {
            args.push_back("-n");
            args.push_back(net_if);
        }
        args.push_back("-v");
        args.push_back("-s");

        std::vector<char*> argv;
        argv.reserve(args.size() + 1);
        for (auto& a : args) argv.push_back(a.data());
        argv.push_back(nullptr);
        execvp(argv[0], argv.data());
        _exit(127);
    }

    // Parent
    close(inpipe[0]);
    close(outpipe[1]);

    // Make stdout non-blocking.
    {
        const int flags = fcntl(outpipe[0], F_GETFL, 0);
        if (flags >= 0) fcntl(outpipe[0], F_SETFL, flags | O_NONBLOCK);
    }

    auto write_all = [&](const std::string& s) {
        const char* p = s.data();
        size_t n = s.size();
        while (n > 0)
        {
            const ssize_t w = ::write(inpipe[1], p, n);
            if (w < 0)
            {
                if (errno == EINTR) continue;
                break;
            }
            p += static_cast<size_t>(w);
            n -= static_cast<size_t>(w);
        }
    };

    auto steady_ms = []() -> int64_t {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
                   std::chrono::steady_clock::now().time_since_epoch())
            .count();
    };

    const int64_t t0 = steady_ms();
    std::string out;
    out.reserve(64 * 1024);

    write_all("/dial " + dest + "\n");

    bool answered = false;
    int64_t answered_at_ms = -1;
    bool sent_hangup = false;
    bool sent_quit = false;
    const int64_t ignore_session_closed_until = (ignore_session_closed_for && ignore_session_closed_window_ms > 0)
        ? (t0 + std::max<int>(0, ignore_session_closed_window_ms))
        : t0;

    const int64_t hard_deadline = t0 + static_cast<int64_t>(hard_timeout_sec) * 1000;
    const int64_t ring_deadline = t0 + static_cast<int64_t>(ring_timeout_sec) * 1000;

    while (steady_ms() < hard_deadline)
    {
        // Reap if the process already exited.
        int status = 0;
        const pid_t w = waitpid(pid, &status, WNOHANG);
        if (w == pid)
        {
            if (WIFEXITED(status)) exit_code = WEXITSTATUS(status);
            else if (WIFSIGNALED(status)) exit_code = 128 + WTERMSIG(status);
            else exit_code = status;
            break;
        }

        // Read any available output.
        {
            char buf[4096];
            while (true)
            {
                const ssize_t r = ::read(outpipe[0], buf, sizeof(buf));
                if (r < 0)
                {
                    if (errno == EINTR) continue;
                    break;
                }
                if (r == 0) break;
                if (out.size() + static_cast<size_t>(r) > (512 * 1024))
                {
                    const size_t avail = (512 * 1024) > out.size() ? ((512 * 1024) - out.size()) : 0;
                    if (avail > 0) out.append(buf, buf + avail);
                    break;
                }
                out.append(buf, buf + r);
            }
        }

        // Update call state based on parsed SIP messages.
        const SipLogParsed parsed = sip_parse_log(out);
        const int64_t now = steady_ms();
        if (!answered)
        {
            answered = sip_method_has_code(parsed, "INVITE", 200);
            if (answered)
            {
                answered_at_ms = steady_ms();
                if (answered_offset_ms) *answered_offset_ms = std::max<int64_t>(0, answered_at_ms - t0);
            }
        }

        // If the far-end ended the call (BYE received) or baresip reports session closed,
        // proactively quit so the HTTP request returns quickly.
        const bool sessionClosedRaw = out.find("session closed:") != std::string::npos ||
            out.find("call: terminate call") != std::string::npos ||
            out.find("call: terminated") != std::string::npos;
        const bool sessionClosed = sessionClosedRaw && (now >= ignore_session_closed_until);
        const bool byeRx = sip_method_req_rx(parsed, "BYE");
        if (!sent_quit && (sessionClosed || byeRx))
        {
            if (stop_reason && stop_reason->empty()) *stop_reason = sessionClosed ? "session_closed" : "bye_rx";
            write_all("/quit\n");
            if (inpipe[1] >= 0) { close(inpipe[1]); inpipe[1] = -1; }
            sent_quit = true;
        }

        const bool ring_timed_out = !answered && now >= ring_deadline;
        const bool talk_elapsed = answered && answered_at_ms > 0 && now >= (answered_at_ms + static_cast<int64_t>(talk_duration_sec) * 1000);

        if (!sent_hangup && (ring_timed_out || talk_elapsed))
        {
            if (stop_reason && stop_reason->empty()) *stop_reason = ring_timed_out ? "ring_timeout" : "talk_elapsed";
            write_all("/hangup\n");
            write_all("/quit\n");
            // Close stdin to let stdio mode shut down even if it ignores /quit.
            close(inpipe[1]);
            inpipe[1] = -1;
            sent_hangup = true;
            sent_quit = true;
        }

        // Sleep/poll.
        fd_set rfds;
        FD_ZERO(&rfds);
        FD_SET(outpipe[0], &rfds);
        timeval tv{};
        tv.tv_sec = 0;
        tv.tv_usec = 200000; // 200ms
        select(outpipe[0] + 1, &rfds, nullptr, nullptr, &tv);
    }

    // If still running, force terminate.
    if (exit_code < 0)
    {
        if (stop_reason && stop_reason->empty()) *stop_reason = "hard_timeout";
        kill(pid, SIGTERM);
        int status = 0;
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) exit_code = WEXITSTATUS(status);
        else if (WIFSIGNALED(status)) exit_code = 128 + WTERMSIG(status);
        else exit_code = status;
    }

    if (inpipe[1] >= 0) close(inpipe[1]);
    close(outpipe[0]);
    elapsed_ms = std::max<int64_t>(0, steady_ms() - t0);
    return out;
}

struct PjsuaRunResult
{
    int exit_code = -1;
    int64_t elapsed_ms = 0;
    int64_t answered_offset_ms = -1;
    std::string stop_reason;
    std::string acked_dtmf;
    std::vector<int> invite_codes;
    std::vector<int> register_codes;
    std::string log;
    bool invite_answered = false;
    bool invite_ringing = false;
    bool bye_tx = false;
    bool bye_rx = false;
    bool cancel_tx = false;
    bool cancel_rx = false;
    int file_port = -1;
    int call_port = -1;
    bool file_connected_to_call = false;
};

static std::string ipv4_for_interface_name(const std::string& ifname)
{
    if (ifname.empty()) return "";
    struct in_addr literal_addr;
    if (inet_pton(AF_INET, ifname.c_str(), &literal_addr) == 1) return ifname;
    struct ifaddrs* ifaddr = nullptr;
    if (getifaddrs(&ifaddr) != 0) return "";
    std::string ip;
    for (struct ifaddrs* ifa = ifaddr; ifa; ifa = ifa->ifa_next)
    {
        if (!ifa->ifa_addr) continue;
        if (ifa->ifa_addr->sa_family != AF_INET) continue;
        if (ifname != ifa->ifa_name) continue;
        char buf[INET_ADDRSTRLEN]{0};
        const auto* sin = reinterpret_cast<const struct sockaddr_in*>(ifa->ifa_addr);
        if (inet_ntop(AF_INET, &sin->sin_addr, buf, sizeof(buf))) { ip = buf; break; }
    }
    freeifaddrs(ifaddr);
    return ip;
}

static int parse_pjsua_port_line_number(const std::string& line)
{
    // Example: "Port #01[48KHz/20ms/1] /path/file.wav  transmitting to:"
    const size_t p = line.find("Port #");
    if (p == std::string::npos) return -1;
    size_t i = p + 6;
    while (i < line.size() && line[i] == ' ') i++;
    int num = 0;
    int digits = 0;
    while (i < line.size() && std::isdigit(static_cast<unsigned char>(line[i])))
    {
        num = (num * 10) + (line[i] - '0');
        digits++;
        i++;
    }
    return digits ? num : -1;
}

[[maybe_unused]] static std::vector<int> pjsua_invite_response_codes(const std::string& log)
{
    // Parse pjsua lines like:
    //   "RX ... Response msg 180/INVITE/cseq=..."
    std::vector<int> codes;
    size_t pos = 0;
    while (pos < log.size())
    {
        const size_t eol = log.find('\n', pos);
        const std::string line = (eol == std::string::npos) ? log.substr(pos) : log.substr(pos, eol - pos);
        const std::string needle = " Response msg ";
        const size_t p = line.find(needle);
        if (p != std::string::npos)
        {
            size_t i = p + needle.size();
            int code = 0;
            int digits = 0;
            while (i < line.size() && digits < 3 && std::isdigit(static_cast<unsigned char>(line[i])))
            {
                code = code * 10 + (line[i] - '0');
                digits++;
                i++;
            }
            if (digits == 3)
            {
                const size_t slash = line.find('/', i);
                if (slash != std::string::npos)
                {
                    const std::string method = line.substr(slash + 1, 6);
                    if (method.rfind("INVITE", 0) == 0) codes.push_back(code);
                }
            }
        }
        if (eol == std::string::npos) break;
        pos = eol + 1;
    }
    std::sort(codes.begin(), codes.end());
    codes.erase(std::unique(codes.begin(), codes.end()), codes.end());
    return codes;
}

static std::vector<int> pjsua_response_codes_for_method(const std::string& log, const std::string& method)
{
    // Parse pjsua lines like:
    //   "RX ... Response msg 180/INVITE/cseq=..."
    std::vector<int> codes;
    if (method.empty()) return codes;
    size_t pos = 0;
    while (pos < log.size())
    {
        const size_t eol = log.find('\n', pos);
        const std::string line = (eol == std::string::npos) ? log.substr(pos) : log.substr(pos, eol - pos);
        const size_t m = line.find("Response msg ");
        if (m != std::string::npos)
        {
            size_t i = m + 13;
            while (i < line.size() && line[i] == ' ') i++;
            int code = 0;
            int digits = 0;
            while (i < line.size() && std::isdigit(static_cast<unsigned char>(line[i])))
            {
                code = code * 10 + (line[i] - '0');
                digits++;
                i++;
            }
            if (digits == 3)
            {
                const size_t slash = line.find('/', i);
                if (slash != std::string::npos)
                {
                    const std::string mth = line.substr(slash + 1, method.size());
                    if (mth == method) codes.push_back(code);
                }
            }
        }
        if (eol == std::string::npos) break;
        pos = eol + 1;
    }
    std::sort(codes.begin(), codes.end());
    codes.erase(std::unique(codes.begin(), codes.end()), codes.end());
    return codes;
}

static int parse_int_after_token(const std::string& line, const std::string& token)
{
    const size_t p = line.find(token);
    if (p == std::string::npos) return -1;
    size_t i = p + token.size();
    while (i < line.size() && line[i] == ' ') i++;
    int n = 0;
    int digits = 0;
    while (i < line.size() && std::isdigit(static_cast<unsigned char>(line[i])))
    {
        n = (n * 10) + (line[i] - '0');
        digits++;
        i++;
    }
    return digits ? n : -1;
}

static int pjsua_find_port_for_wav(const std::string& log, const std::string& wav_path)
{
    if (wav_path.empty()) return -1;
    std::string filename;
    try { filename = std::filesystem::path(wav_path).filename().string(); } catch (...) {}
    int port = -1;
    size_t pos = 0;
    while (pos < log.size())
    {
        const size_t eol = log.find('\n', pos);
        const std::string line = (eol == std::string::npos) ? log.substr(pos) : log.substr(pos, eol - pos);
        const bool match = line.find(wav_path) != std::string::npos || (!filename.empty() && line.find(filename) != std::string::npos);
        if (match)
        {
            int n = parse_int_after_token(line, "Added port ");
            if (n < 0) n = parse_pjsua_port_line_number(line);
            if (n < 0) n = parse_int_after_token(line, "Port ");
            if (n >= 0) port = n;
        }
        if (eol == std::string::npos) break;
        pos = eol + 1;
    }
    return port;
}

static int pjsua_find_call_port(const std::string& log)
{
    // Heuristic: use the last "Added port N (sip:...)" seen.
    int port = -1;
    size_t pos = 0;
    while (pos < log.size())
    {
        const size_t eol = log.find('\n', pos);
        const std::string line = (eol == std::string::npos) ? log.substr(pos) : log.substr(pos, eol - pos);
        if (line.find("Added port ") != std::string::npos && line.find("(sip:") != std::string::npos)
        {
            const int n = parse_int_after_token(line, "Added port ");
            if (n > 0) port = n;
        }
        if (eol == std::string::npos) break;
        pos = eol + 1;
    }
    return port;
}

static int64_t wav_pcm_duration_ms(const std::string& path)
{
    if (path.empty()) return -1;
    std::ifstream in(path, std::ios::binary);
    if (!in) return -1;
    std::vector<uint8_t> data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
    if (data.size() < 44) return -1;
    if (std::string(reinterpret_cast<const char*>(data.data()), 4) != "RIFF" ||
        std::string(reinterpret_cast<const char*>(data.data() + 8), 4) != "WAVE")
    {
        return -1;
    }
    auto rd16 = [&](size_t off) -> uint16_t {
        if (off + 2 > data.size()) return 0;
        return static_cast<uint16_t>(data[off]) | (static_cast<uint16_t>(data[off + 1]) << 8);
    };
    auto rd32 = [&](size_t off) -> uint32_t {
        if (off + 4 > data.size()) return 0;
        return static_cast<uint32_t>(data[off]) |
               (static_cast<uint32_t>(data[off + 1]) << 8) |
               (static_cast<uint32_t>(data[off + 2]) << 16) |
               (static_cast<uint32_t>(data[off + 3]) << 24);
    };
    uint16_t audioFormat = 0;
    uint16_t channels = 0;
    uint32_t sampleRate = 0;
    uint16_t bitsPerSample = 0;
    size_t audioSize = 0;
    size_t pos = 12;
    while (pos + 8 <= data.size())
    {
        const std::string id(reinterpret_cast<const char*>(data.data() + pos), 4);
        const uint32_t size = rd32(pos + 4);
        const size_t chunkData = pos + 8;
        if (chunkData + size > data.size()) break;
        if (id == "fmt ")
        {
            if (size < 16) break;
            audioFormat = rd16(chunkData);
            channels = rd16(chunkData + 2);
            sampleRate = rd32(chunkData + 4);
            bitsPerSample = rd16(chunkData + 14);
        }
        else if (id == "data")
        {
            audioSize = size;
        }
        pos = chunkData + size + (size % 2);
    }
    if (audioFormat != 1 || channels == 0 || sampleRate == 0 || bitsPerSample == 0 || audioSize == 0) return -1;
    const uint64_t bytesPerSec = static_cast<uint64_t>(sampleRate) * static_cast<uint64_t>(channels) * static_cast<uint64_t>(bitsPerSample / 8);
    if (bytesPerSec == 0) return -1;
    const uint64_t ms = (static_cast<uint64_t>(audioSize) * 1000ULL) / bytesPerSec;
    return static_cast<int64_t>(ms);
}

static bool write_silence_wav_48k_mono16(const std::string& path, int ms, std::string& err)
{
    err.clear();
    ms = std::max(1, std::min(30000, ms));
    const uint16_t channels = 1;
    const uint32_t rate = 48000;
    const uint16_t bps = 16;
    const uint32_t bytesPerSample = channels * (bps / 8);
    const uint32_t frames = static_cast<uint32_t>((static_cast<uint64_t>(rate) * static_cast<uint64_t>(ms)) / 1000ULL);
    const uint32_t dataSize = frames * bytesPerSample;
    const uint32_t byteRate = rate * bytesPerSample;
    const uint16_t blockAlign = static_cast<uint16_t>(bytesPerSample);
    const uint32_t riffSize = 36u + dataSize;

    std::ofstream out(path, std::ios::binary | std::ios::trunc);
    if (!out) { err = "failed to write wav: " + path; return false; }
    auto wr16 = [&](uint16_t v) {
        out.put(static_cast<char>(v & 0xFF));
        out.put(static_cast<char>((v >> 8) & 0xFF));
    };
    auto wr32 = [&](uint32_t v) {
        out.put(static_cast<char>(v & 0xFF));
        out.put(static_cast<char>((v >> 8) & 0xFF));
        out.put(static_cast<char>((v >> 16) & 0xFF));
        out.put(static_cast<char>((v >> 24) & 0xFF));
    };
    out.write("RIFF", 4);
    wr32(riffSize);
    out.write("WAVE", 4);
    out.write("fmt ", 4);
    wr32(16);
    wr16(1); // PCM
    wr16(channels);
    wr32(rate);
    wr32(byteRate);
    wr16(blockAlign);
    wr16(bps);
    out.write("data", 4);
    wr32(dataSize);

    // Data: all zeros (silence).
    std::string zeros;
    zeros.resize(4096, '\0');
    uint32_t remaining = dataSize;
    while (remaining > 0)
    {
        const uint32_t chunk = std::min<uint32_t>(remaining, static_cast<uint32_t>(zeros.size()));
        out.write(zeros.data(), static_cast<std::streamsize>(chunk));
        remaining -= chunk;
    }
    if (!out) { err = "failed to write wav data"; return false; }
    return true;
}

static std::string pjsua_run_call_with_file(
    const std::string& pjsua_path,
    const std::string& host,
    const std::string& port,
    const std::string& ext,
    const std::string& pass,
    const std::string& transport,
    const std::string& net_if,
    const std::string& dest,
    const std::string& wav_path,
    int duration_sec,
    int ring_timeout_sec,
    int ack_wait_sec,
    const std::vector<std::string>& ack_dtmf,
    PjsuaRunResult& outRes
)
{
    outRes = PjsuaRunResult{};
    duration_sec = std::max(5, std::min(600, duration_sec));
    ring_timeout_sec = std::max(5, std::min(600, ring_timeout_sec));
    ack_wait_sec = std::max(0, std::min(600, ack_wait_sec));
    if (pjsua_path.empty() || host.empty() || ext.empty() || pass.empty() || dest.empty()) return "";

    const std::string bind_ip = net_if.empty() ? "" : ipv4_for_interface_name(net_if);

    std::vector<std::string> args;
    args.push_back(pjsua_path);
    args.push_back("--no-color");
    args.push_back("--null-audio");
    // Use verbose logs so DTMF/SIP INFO details have a chance to appear in stdout (we parse stdout).
    args.push_back("--log-level=6");
    // Ensure events like received DTMF show up in stdout (we parse stdout).
    args.push_back("--app-log-level=6");

    // Transport selection.
    const std::string t = transport.empty() ? "udp" : transport;
    if (t == "udp") args.push_back("--no-tcp");
    else if (t == "tcp") args.push_back("--no-udp");

    // Bind to interface IP when provided (helps VPN/tunnel routing).
    if (!bind_ip.empty())
    {
        args.push_back("--bound-addr=" + bind_ip);
        args.push_back("--ip-addr=" + bind_ip);
    }

    // Account.
    const std::string hp = port.empty() ? host : (host + ":" + port);
    args.push_back("--registrar=sip:" + hp);
    args.push_back("--id=sip:" + ext + "@" + hp);
    args.push_back("--realm=*");
    args.push_back("--username=" + ext);
    args.push_back("--password=" + pass);
    // Ask pjsua itself to enforce a maximum call duration. This is important because
    // interactive hangup commands may not be recognized consistently across builds,
    // and we never want calls to linger indefinitely on the PBX/handset.
    {
        // Keep the cap aligned with our semantics:
        // - duration_sec is a max cap
        // - if ACK is enabled, we may wait up to ack_wait_sec after audio completes
        const int cap = std::max(5, std::min(600, duration_sec + ack_wait_sec + 10));
        args.push_back("--duration=" + std::to_string(cap));
    }

    if (!wav_path.empty())
    {
        args.push_back("--play-file=" + wav_path);
    }

    // Spawn pjsua under a PTY so interactive commands work.
    int master_fd = -1;
    pid_t pid = forkpty(&master_fd, nullptr, nullptr, nullptr);
    if (pid < 0) return "";
    if (pid == 0)
    {
        std::vector<char*> argv;
        argv.reserve(args.size() + 1);
        for (auto& a : args) argv.push_back(a.data());
        argv.push_back(nullptr);
        execvp(argv[0], argv.data());
        _exit(127);
    }

    auto write_str = [&](const std::string& s) {
        if (master_fd < 0) return;
        const char* p = s.data();
        size_t n = s.size();
        while (n > 0)
        {
            const ssize_t w = ::write(master_fd, p, n);
            if (w < 0)
            {
                if (errno == EINTR) continue;
                break;
            }
            p += static_cast<size_t>(w);
            n -= static_cast<size_t>(w);
        }
    };

    // Non-blocking read.
    {
        const int flags = fcntl(master_fd, F_GETFL, 0);
        if (flags >= 0) fcntl(master_fd, F_SETFL, flags | O_NONBLOCK);
    }

    auto steady_ms = []() -> int64_t {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
                   std::chrono::steady_clock::now().time_since_epoch())
            .count();
    };

    const int64_t t0 = steady_ms();
    // Hard deadline for the pjsua helper process. We use a small pad to allow
    // SIP BYE + cleanup, but avoid keeping calls open long after the desired end.
    const int64_t hard_deadline = t0 + static_cast<int64_t>(duration_sec + ack_wait_sec + 15) * 1000;
    std::string log;
    log.reserve(256 * 1024);
    bool sent_make_call = false;
    int64_t call_started_at = -1;
    bool answered = false;
    int64_t answered_at = -1;
    bool connected = false;
    int filePort = -1;
    int callPort = -1;
    int connectedCallPort = -1;
    bool sent_connect = false;
    int64_t last_cl_ms = 0;
    bool audio_disconnected = false;
    const int64_t audio_ms = wav_path.empty() ? -1 : wav_pcm_duration_ms(wav_path);
    const bool ack_required = !ack_dtmf.empty() && ack_wait_sec > 0;
    bool exit_requested = false;
    int64_t exit_deadline_ms = 0;

    auto allowed_ack = [&](char ch) -> bool {
        for (const auto& k : ack_dtmf)
        {
            if (k.size() == 1 && k[0] == ch) return true;
        }
        return false;
    };
    auto find_received_dtmf = [&](char& outDigit) -> bool {
        // Best-effort parse of pjsua logs for received DTMF digits.
        const size_t keep = std::min<size_t>(50000, log.size());
        const std::string tail = keep ? log.substr(log.size() - keep) : log;
        std::string lower;
        lower.reserve(tail.size());
        for (char ch : tail) lower.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(ch))));

        // Common variants:
        // - "Received DTMF digit 1"
        // - "DTMF 1"
        // - SIP INFO body: "Signal=1"
        size_t pos = lower.rfind("received dtmf");
        if (pos == std::string::npos) pos = lower.rfind("dtmf");
        if (pos == std::string::npos) pos = lower.rfind("signal=");
        if (pos == std::string::npos) return false;

        // Scan forward for a plausible digit char.
        const size_t end = std::min(lower.size(), pos + 400);
        for (size_t i = pos; i < end; ++i)
        {
            const char ch = tail[i];
            if ((ch >= '0' && ch <= '9') || ch == '*' || ch == '#')
            {
                outDigit = ch;
                return true;
            }
        }
        return false;
    };

    while (steady_ms() < hard_deadline)
    {
        // Reap if exited.
        int status = 0;
        const pid_t w = waitpid(pid, &status, WNOHANG);
        if (w == pid)
        {
            if (WIFEXITED(status)) outRes.exit_code = WEXITSTATUS(status);
            else if (WIFSIGNALED(status)) outRes.exit_code = 128 + WTERMSIG(status);
            else outRes.exit_code = status;
            break;
        }

        // Read available output.
        char buf[4096];
        while (true)
        {
            const ssize_t r = ::read(master_fd, buf, sizeof(buf));
            if (r < 0)
            {
                if (errno == EINTR) continue;
                break;
            }
            if (r == 0) break;
            if (log.size() + static_cast<size_t>(r) > (512 * 1024))
            {
                const size_t avail = (512 * 1024) > log.size() ? ((512 * 1024) - log.size()) : 0;
                if (avail > 0) log.append(buf, buf + avail);
                break;
            }
            log.append(buf, buf + r);
        }

        const int64_t now = steady_ms();

        if (!sent_make_call)
        {
            const bool registered =
                log.find("registration success") != std::string::npos ||
                log.find("200/REGISTER") != std::string::npos ||
                log.find("200/OK (expires=") != std::string::npos;
            const bool register_failed =
                log.find("403/REGISTER") != std::string::npos ||
                log.find("404/REGISTER") != std::string::npos ||
                log.find("503/REGISTER") != std::string::npos;
            // Prefer waiting for registration. If a PBX does not require registration
            // or pjsua's wording changes, place the call after a short startup grace.
            if (registered || register_failed || now >= (t0 + 3000))
            {
                write_str("m\n");
                write_str(dest + "\n");
                sent_make_call = true;
                call_started_at = now;
            }
        }

        auto request_hangup_and_quit = [&]() {
            // Try multiple forms; pjsua console/CLI variants differ across builds.
            // Newer CLI mode uses shortcuts such as "g" for hangup (see pjsua CLI docs).
            write_str("g\n");
            write_str("h\n");
            write_str("h 0\n");
            write_str("hangup\n");
            write_str("hangup 0\n");
            write_str("hA\n");
            write_str("hangup_all\n");
            write_str("q\n");
            write_str("quit\n");
            // Give pjsua a short window to send BYE/cleanup before we hard-kill it.
            exit_requested = true;
            exit_deadline_ms = steady_ms() + 3000;
        };

        auto connect_file_to_call = [&]() {
            if (filePort <= 0 || callPort <= 0) return;
            // Use exactly one conference-connect form. Sending both the one-line
            // and interactive forms can create duplicate WAV->call links on pjsua
            // builds that accept both.
            write_str("cc " + std::to_string(filePort) + " " + std::to_string(callPort) + "\n");
            connected = true;
            connectedCallPort = callPort;
            sent_connect = true;
            audio_disconnected = false;
            outRes.file_port = filePort;
            outRes.call_port = callPort;
            outRes.file_connected_to_call = true;
        };

        auto disconnect_file_from_call = [&](int targetCallPort) {
            if (filePort <= 0 || targetCallPort <= 0) return;
            write_str("cd " + std::to_string(filePort) + " " + std::to_string(targetCallPort) + "\n");
        };

        const int64_t ring_deadline = (call_started_at > 0 ? call_started_at : t0) + static_cast<int64_t>(ring_timeout_sec) * 1000;
        if (sent_make_call && !answered && now >= ring_deadline)
        {
            // Ring timeout: hang up and quit so the next target can proceed.
            request_hangup_and_quit();
            outRes.stop_reason = "ring_timeout";
            // Wait for child to exit (or until exit_deadline_ms), then continue reaping.
        }

        // Detect call confirmed/answered.
        if (!answered && (log.find(" state changed to CONFIRMED") != std::string::npos ||
                          log.find("Call established") != std::string::npos ||
                          log.find("Call connected") != std::string::npos ||
                          log.find(" 200/INVITE") != std::string::npos))
        {
            answered = true;
            answered_at = steady_ms();
            outRes.answered_offset_ms = std::max<int64_t>(0, answered_at - t0);
            outRes.invite_answered = true;
            // Ask for conference ports so we can connect wav -> call.
            write_str("cl\n");
            last_cl_ms = answered_at;
        }

        // If ACK is required, wait for a DTMF keypress window AFTER audio finishes, then hang up.
        if (answered && ack_required && outRes.acked_dtmf.empty())
        {
            char dig = '\0';
            if (find_received_dtmf(dig) && allowed_ack(dig))
            {
                outRes.acked_dtmf.assign(1, dig);
                outRes.stop_reason = "acked";
                request_hangup_and_quit();
                // Wait for child to exit (or until exit_deadline_ms), then continue reaping.
            }
            const int64_t audio_done_at = (answered_at > 0 && audio_ms > 0) ? (answered_at + audio_ms) : answered_at;
            const int64_t ack_deadline = audio_done_at > 0
                ? (audio_done_at + static_cast<int64_t>(ack_wait_sec) * 1000)
                : (t0 + static_cast<int64_t>(duration_sec) * 1000);
            // duration_sec is a max call cap. If we hit it, stop regardless of ack_wait_sec.
            const int64_t max_deadline = (answered_at > 0) ? (answered_at + static_cast<int64_t>(duration_sec) * 1000) : ack_deadline;
            const int64_t desired_deadline = std::min(ack_deadline, max_deadline);
            if (answered_at > 0 && now >= desired_deadline)
            {
                outRes.stop_reason = "ack_timeout";
                request_hangup_and_quit();
                // Wait for child to exit (or until exit_deadline_ms), then continue reaping.
            }
        }

        // Parse conference ports after "Conference ports:" appears.
        if (answered && !connected && !wav_path.empty())
        {
            // Try to learn ports from log lines first (these appear even if "cl" output
            // isn't captured for some reason).
            if (filePort < 0) filePort = pjsua_find_port_for_wav(log, wav_path);
            if (callPort < 0) callPort = pjsua_find_call_port(log);

            const size_t p = [&]() -> size_t {
                size_t q = log.rfind("Conference ports:");
                if (q != std::string::npos) return q;
                // Some builds print without colon.
                q = log.rfind("Conference ports");
                return q;
            }();
            if (p != std::string::npos)
            {
                // Scan lines after that marker (best-effort).
                const std::string tail = log.substr(p);
                std::istringstream iss(tail);
                std::string line;
                while (std::getline(iss, line))
                {
                    if (filePort < 0 && line.find(wav_path) != std::string::npos)
                    {
                        filePort = parse_pjsua_port_line_number(line);
                    }
                    // Call port line contains the remote SIP URI, not ring/ringback.
                    if (callPort < 0 && line.find("sip:") != std::string::npos &&
                        line.find("ringback") == std::string::npos &&
                        line.find(" ring") == std::string::npos &&
                        line.find("Master/sound") == std::string::npos)
                    {
                        // Avoid matching registrar/account display; require "Port #"
                        if (line.find("Port #") != std::string::npos)
                        {
                            const int n = parse_pjsua_port_line_number(line);
                            // Ignore master/sound and file ports.
                            if (n > 0 && n != filePort) callPort = n;
                        }
                    }
                }

                if (filePort > 0 && callPort > 0 && !sent_connect)
                {
                    // Connect file -> call (source to destination).
                    connect_file_to_call();
                }
            }
            // If we don't have a call port yet, keep requesting `cl` until it shows up
            // (the call audio port is typically added shortly after CONFIRMED).
            if (!sent_connect && callPort < 0 && (now - last_cl_ms) >= 500)
            {
                write_str("cl\n");
                last_cl_ms = now;
            }
        }

        // Some PBXs send UPDATE/re-INVITE shortly after answer, which can make pjsua destroy
        // the original SIP media conference port and add a replacement. If we keep the WAV
        // connected only to the old port, the caller hears silence after the media update.
        if (answered && connected && !wav_path.empty())
        {
            if (filePort < 0) filePort = pjsua_find_port_for_wav(log, wav_path);
            const int latestCallPort = pjsua_find_call_port(log);
            if (latestCallPort > 0 && latestCallPort != connectedCallPort)
            {
                callPort = latestCallPort;
                connectedCallPort = latestCallPort;
                outRes.call_port = callPort;
                if (filePort > 0)
                {
                    write_str("cc " + std::to_string(filePort) + " " + std::to_string(callPort) + "\n");
                    audio_disconnected = false;
                    outRes.file_connected_to_call = true;
                }
            }
        }

        // duration_sec semantics: max call time cap. Actual hangup time is driven by audio length.
        if (!ack_required && answered && answered_at > 0)
        {
            const int64_t max_deadline = answered_at + static_cast<int64_t>(duration_sec) * 1000;
            int64_t desired_deadline = max_deadline;
            if (audio_ms > 0)
            {
                // Hang up when audio is done (small pad to drain last frame).
                desired_deadline = std::min(max_deadline, answered_at + audio_ms + 250);
            }
            if (now >= desired_deadline)
            {
                request_hangup_and_quit();
                outRes.stop_reason = (audio_ms > 0 && desired_deadline < max_deadline) ? "audio_complete" : "max_call_time";
                // Wait for child to exit (or until exit_deadline_ms), then continue reaping.
            }
        }

        // If we've requested exit, give pjsua a moment to terminate on its own (sending BYE).
        // Only after that window do we break out and let the hard-kill path run.
        if (exit_requested && now >= exit_deadline_ms)
        {
            break;
        }

        // Stop transmitting the WAV after it has played once, but keep the call alive
        // for the requested duration (silence is fine).
        if (answered && connected && !audio_disconnected && audio_ms > 0 && filePort > 0 && callPort > 0)
        {
            // Small pad to ensure the last frame drains.
            if (answered_at > 0 && now >= (answered_at + audio_ms + 250))
            {
                // Disconnect file -> call.
                disconnect_file_from_call(connectedCallPort > 0 ? connectedCallPort : callPort);
                audio_disconnected = true;
            }
        }

        fd_set rfds;
        FD_ZERO(&rfds);
        FD_SET(master_fd, &rfds);
        timeval tv{};
        tv.tv_sec = 0;
        tv.tv_usec = 200000;
        select(master_fd + 1, &rfds, nullptr, nullptr, &tv);
    }

    // Force terminate if still running.
    if (outRes.exit_code < 0)
    {
        outRes.stop_reason = outRes.stop_reason.empty() ? "hard_timeout" : outRes.stop_reason;
        kill(pid, SIGTERM);
        int status = 0;
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) outRes.exit_code = WEXITSTATUS(status);
        else if (WIFSIGNALED(status)) outRes.exit_code = 128 + WTERMSIG(status);
        else outRes.exit_code = status;
    }

    close(master_fd);
    outRes.elapsed_ms = std::max<int64_t>(0, steady_ms() - t0);
    outRes.log = log;
    outRes.invite_codes = pjsua_response_codes_for_method(log, "INVITE");
    outRes.register_codes = pjsua_response_codes_for_method(log, "REGISTER");
    outRes.invite_ringing =
        std::find(outRes.invite_codes.begin(), outRes.invite_codes.end(), 180) != outRes.invite_codes.end() ||
        std::find(outRes.invite_codes.begin(), outRes.invite_codes.end(), 183) != outRes.invite_codes.end();
    return log;
}

#if defined(OPCBRIDGE_HAVE_PJSUA2)
namespace {
struct SipPjsua2Shared
{
    std::mutex mu;
    std::condition_variable cv;
    bool invite_ringing = false;
    bool invite_answered = false;
    bool disconnected = false;
    bool file_connected_to_call = false;
    int64_t answered_offset_ms = -1;
    std::string last_dtmf;
    std::string stop_reason;
};

class SipPjsua2LogWriter final : public pj::LogWriter
{
public:
    void write(const pj::LogEntry& entry) override
    {
        std::lock_guard<std::mutex> lock(mu_);
        // entry.msg already includes newline sometimes; normalize to single \n.
        buf_ += entry.msg;
        if (!buf_.empty() && buf_.back() != '\n') buf_ += "\n";
        // Keep last ~512KB.
        if (buf_.size() > (512 * 1024))
        {
            buf_.erase(0, buf_.size() - (512 * 1024));
        }
    }

    std::string snapshot() const
    {
        std::lock_guard<std::mutex> lock(mu_);
        return buf_;
    }

private:
    mutable std::mutex mu_;
    std::string buf_;
};

class SipPjsua2Call final : public pj::Call
{
public:
    SipPjsua2Call(pj::Account& acc, int call_id, SipPjsua2Shared& shared, int64_t start_ms)
        : pj::Call(acc, call_id), shared_(shared), start_ms_(start_ms)
    {}

    void set_player(pj::AudioMediaPlayer* player) { player_ = player; }
    void set_keepalive_player(pj::AudioMediaPlayer* player) { keepalive_player_ = player; }

    void onCallState(pj::OnCallStateParam&) override
    {
        pj::CallInfo ci = getInfo();
        const int64_t now = steady_ms();
        {
            std::lock_guard<std::mutex> lock(shared_.mu);
            if (ci.state == PJSIP_INV_STATE_EARLY) shared_.invite_ringing = true;
            if (ci.state == PJSIP_INV_STATE_CONFIRMED)
            {
                if (!shared_.invite_answered)
                {
                    shared_.invite_answered = true;
                    shared_.answered_offset_ms = std::max<int64_t>(0, now - start_ms_);
                }
                start_players_if_ready(ci);
            }
            if (ci.state == PJSIP_INV_STATE_DISCONNECTED)
            {
                shared_.disconnected = true;
                if (shared_.stop_reason.empty()) shared_.stop_reason = "session_closed";
            }
        }
        shared_.cv.notify_all();
    }

    void onCallMediaState(pj::OnCallMediaStateParam&) override
    {
        if (!player_ && !keepalive_player_) return;
        try
        {
            const pj::CallInfo ci = getInfo();
            start_players_if_ready(ci);
        }
        catch (...)
        {
            // best-effort
        }
    }

    void onDtmfDigit(pj::OnDtmfDigitParam& prm) override
    {
        {
            std::lock_guard<std::mutex> lock(shared_.mu);
            shared_.last_dtmf = prm.digit;
        }
        shared_.cv.notify_all();
    }

    void onDtmfEvent(pj::OnDtmfEventParam& prm) override
    {
        {
            std::lock_guard<std::mutex> lock(shared_.mu);
            shared_.last_dtmf = prm.digit;
        }
        shared_.cv.notify_all();
    }

private:
    void start_players_if_ready(const pj::CallInfo& ci)
    {
        // Some PBXs offer early media before the callee answers. Starting the message
        // player then can consume the whole WAV during ringback, leaving silence after
        // answer. Only attach players once the INVITE is confirmed.
        if (ci.state != PJSIP_INV_STATE_CONFIRMED) return;
        if (!player_ && !keepalive_player_) return;

        for (unsigned i = 0; i < ci.media.size(); ++i)
        {
            if (ci.media[i].type != PJMEDIA_TYPE_AUDIO) continue;
            if (ci.media[i].status != PJSUA_CALL_MEDIA_ACTIVE &&
                ci.media[i].status != PJSUA_CALL_MEDIA_REMOTE_HOLD)
            {
                continue;
            }

            // getAudioMedia() returns a wrapper object; keep it alive as a member so the
            // transmit connection stays valid.
            audio_media_ = getAudioMedia(static_cast<int>(i));
            pj::AudioMedia& am = *audio_media_;
            if (keepalive_player_ && !keepalive_started_)
            {
                keepalive_player_->startTransmit(am);
                keepalive_started_ = true;
            }
            if (player_ && !player_started_)
            {
                player_->startTransmit(am);
                player_started_ = true;
            }

            {
                std::lock_guard<std::mutex> lock(shared_.mu);
                shared_.file_connected_to_call = player_started_;
            }
            shared_.cv.notify_all();
            break;
        }
    }

    static int64_t steady_ms()
    {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
                   std::chrono::steady_clock::now().time_since_epoch())
            .count();
    }

    SipPjsua2Shared& shared_;
    int64_t start_ms_ = 0;
    pj::AudioMediaPlayer* player_ = nullptr;
    pj::AudioMediaPlayer* keepalive_player_ = nullptr;
    bool player_started_ = false;
    bool keepalive_started_ = false;
    std::optional<pj::AudioMedia> audio_media_;
};

static std::string pjsua2_run_call_with_file(
    const std::string& host,
    const std::string& port,
    const std::string& ext,
    const std::string& pass,
    const std::string& transport,
    const std::string& net_if,
    const std::string& dest,
    const std::string& wav_path,
    const std::string& ack_confirm_wav_path,
    const std::string& keepalive_silence_wav_path,
    int ack_confirm_max_ms,
    int duration_sec,
    int ring_timeout_sec,
    int ack_wait_sec,
    const std::vector<std::string>& ack_dtmf,
    PjsuaRunResult& outRes
)
{
    outRes = PjsuaRunResult{};
    duration_sec = std::max(5, std::min(600, duration_sec));
    ring_timeout_sec = std::max(5, std::min(600, ring_timeout_sec));
    ack_wait_sec = std::max(0, std::min(600, ack_wait_sec));
    ack_confirm_max_ms = std::max(0, std::min(30000, ack_confirm_max_ms));
    if (host.empty() || ext.empty() || pass.empty() || dest.empty()) return "";

    auto steady_ms = []() -> int64_t {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
                   std::chrono::steady_clock::now().time_since_epoch())
            .count();
    };

    const int64_t t0 = steady_ms();
    const int64_t hard_deadline = t0 + static_cast<int64_t>(duration_sec + 60) * 1000;
    const int64_t ring_deadline = t0 + static_cast<int64_t>(ring_timeout_sec) * 1000;

    const std::string bind_ip = net_if.empty() ? "" : ipv4_for_interface_name(net_if);
    const std::string hp = port.empty() ? host : (host + ":" + port);
    const bool ack_required = !ack_dtmf.empty() && ack_wait_sec > 0;

    auto allowed_ack = [&](const std::string& d) -> bool {
        for (const auto& k : ack_dtmf)
        {
            if (k == d) return true;
        }
        return false;
    };

    SipPjsua2LogWriter logger;
    SipPjsua2Shared shared;

    try
    {
        pj::Endpoint ep;
        ep.libCreate();

        pj::EpConfig epCfg;
        epCfg.logConfig.level = 6;
        epCfg.logConfig.consoleLevel = 0;
        epCfg.logConfig.writer = &logger;

        ep.libInit(epCfg);

        pj::TransportConfig tc;
        tc.port = 0;
        if (!bind_ip.empty())
        {
            tc.boundAddress = bind_ip;
            tc.publicAddress = bind_ip;
        }

        const std::string t = transport.empty() ? "udp" : transport;
        if (t == "tcp") ep.transportCreate(PJSIP_TRANSPORT_TCP, tc);
        else ep.transportCreate(PJSIP_TRANSPORT_UDP, tc);

        // Headless/null audio device.
        ep.audDevManager().setNullDev();

        ep.libStart();

        pj::AccountConfig ac;
        ac.idUri = "sip:" + ext + "@" + hp;
        ac.regConfig.registrarUri = "sip:" + hp;
        ac.sipConfig.authCreds.push_back(pj::AuthCredInfo("digest", "*", ext, 0, pass));

        class TmpAccount final : public pj::Account {
        public:
            explicit TmpAccount(SipPjsua2Shared& shared) : shared_(shared) {}
            void onRegState(pj::OnRegStateParam&) override { shared_.cv.notify_all(); }
        private:
            SipPjsua2Shared& shared_;
        };

        TmpAccount acc(shared);
        acc.create(ac);

        // Call.
        SipPjsua2Call call(acc, PJSUA_INVALID_ID, shared, t0);
        pj::AudioMediaPlayer player;
        pj::AudioMediaPlayer keepalive;
        if (!keepalive_silence_wav_path.empty())
        {
            // Default behavior is looping (NO_LOOP flag disables looping).
            keepalive.createPlayer(keepalive_silence_wav_path, 0);
            call.set_keepalive_player(&keepalive);
        }
        if (!wav_path.empty())
        {
            // No loop; keep call open for duration even after audio ends.
            player.createPlayer(wav_path, PJMEDIA_FILE_NO_LOOP);
            call.set_player(&player);
        }

        pj::CallOpParam prm(true);
        prm.opt.audioCount = 1;
        prm.opt.videoCount = 0;
        call.makeCall(dest, prm);

        bool acked = false;
        // Duration semantics:
        // - duration_sec is a MAX call time cap after answer (safety limit).
        // - Actual hangup timing is driven by message audio length, plus ack_wait_sec when ACK is required.
        const int64_t msg_ms = wav_path.empty() ? 0 : std::max<int64_t>(0, wav_pcm_duration_ms(wav_path));

        while (steady_ms() < hard_deadline)
        {
            std::unique_lock<std::mutex> lock(shared.mu);
            shared.cv.wait_for(lock, std::chrono::milliseconds(100));

            const int64_t now = steady_ms();

            // Ring timeout before answer.
            if (!shared.invite_answered && now > ring_deadline)
            {
                if (shared.stop_reason.empty()) shared.stop_reason = "ring_timeout";
                break;
            }

            // ACK DTMF (stop calling).
            if (ack_required && shared.invite_answered && !acked && !shared.last_dtmf.empty())
            {
                if (allowed_ack(shared.last_dtmf))
                {
                    outRes.acked_dtmf = shared.last_dtmf;
                    shared.stop_reason = "acked";
                    acked = true;
                    break;
                }
                shared.last_dtmf.clear();
            }

            // Stop after duration (once answered).
            if (shared.invite_answered)
            {
                const int64_t answered_at = t0 + std::max<int64_t>(0, shared.answered_offset_ms);
                const int64_t max_end_at = answered_at + static_cast<int64_t>(duration_sec) * 1000;
                const int64_t audio_end_at = answered_at + msg_ms;

                // ACK timer starts AFTER audio finishes.
                const int64_t ack_end_at = audio_end_at + static_cast<int64_t>(ack_wait_sec) * 1000;

                // Desired hangup time (capped by max_end_at):
                // - if ACK required: audio_end_at + ack_wait_sec
                // - else: audio_end_at
                int64_t desired_end_at = ack_required ? ack_end_at : audio_end_at;
                if (desired_end_at > max_end_at) desired_end_at = max_end_at;

                if (!acked && now > max_end_at)
                {
                    if (shared.stop_reason.empty()) shared.stop_reason = "max_call_time";
                    break;
                }

                if (ack_required)
                {
                    if (acked && shared.stop_reason == "acked") break;
                    if (!acked && now > desired_end_at)
                    {
                        if (shared.stop_reason.empty()) shared.stop_reason = "ack_timeout";
                        break;
                    }
                }
                else
                {
                    if (now > desired_end_at)
                    {
                        if (shared.stop_reason.empty()) shared.stop_reason = "audio_complete";
                        break;
                    }
                }
            }

            if (shared.disconnected)
            {
                if (shared.stop_reason.empty()) shared.stop_reason = "session_closed";
                break;
            }
        }

        // Hang up if still up.
        {
            std::lock_guard<std::mutex> lock(shared.mu);
            outRes.stop_reason = shared.stop_reason.empty() ? "hard_timeout" : shared.stop_reason;
            outRes.invite_answered = shared.invite_answered;
            outRes.invite_ringing = shared.invite_ringing;
            outRes.answered_offset_ms = shared.answered_offset_ms;
            outRes.file_connected_to_call = shared.file_connected_to_call;
        }

        // If the call was ACKed via DTMF and we have a confirmation wav, play it once before hangup.
        if (acked && !ack_confirm_wav_path.empty() && ack_confirm_max_ms > 0)
        {
            try
            {
                pj::CallInfo ci = call.getInfo();
                if (ci.state == PJSIP_INV_STATE_CONFIRMED)
                {
                    const int64_t wavMs = wav_pcm_duration_ms(ack_confirm_wav_path);
                    const int64_t playMs = (wavMs > 0) ? std::min<int64_t>(wavMs, ack_confirm_max_ms) : ack_confirm_max_ms;

                    pj::AudioMediaPlayer confirm;
                    confirm.createPlayer(ack_confirm_wav_path, PJMEDIA_FILE_NO_LOOP);
                    try
                    {
                        // Attach to the first audio media stream (best-effort).
                        pj::AudioMedia am = call.getAudioMedia(0);
                        confirm.startTransmit(am);
                    }
                    catch (...)
                    {
                        // ignore: still wait a tiny bit to give the PBX time to flush.
                    }

                    if (playMs > 0)
                    {
                        std::this_thread::sleep_for(std::chrono::milliseconds(playMs));
                    }
                }
            }
            catch (...)
            {
                // best-effort
            }
        }

        try
        {
            pj::CallInfo ci = call.getInfo();
            if (ci.state != PJSIP_INV_STATE_DISCONNECTED)
            {
                pj::CallOpParam h;
                h.statusCode = PJSIP_SC_DECLINE;
                call.hangup(h);
                outRes.bye_tx = true;
            }
        }
        catch (...) {}

        // Allow a moment for cleanup.
        std::this_thread::sleep_for(std::chrono::milliseconds(50));

        // Destroy endpoint (also cleans up accounts/calls).
        try { ep.libDestroy(); } catch (...) {}

        outRes.exit_code = 0;
    }
    catch (const pj::Error& e)
    {
        outRes.exit_code = 1;
        outRes.stop_reason = outRes.stop_reason.empty() ? "exception" : outRes.stop_reason;
        outRes.log = logger.snapshot() + "\nPJSUA2 Error: " + e.info();
        outRes.elapsed_ms = std::max<int64_t>(0, steady_ms() - t0);
        return outRes.log;
    }
    catch (...)
    {
        outRes.exit_code = 1;
        outRes.stop_reason = outRes.stop_reason.empty() ? "exception" : outRes.stop_reason;
    }

    outRes.elapsed_ms = std::max<int64_t>(0, steady_ms() - t0);
    outRes.log = logger.snapshot();
    outRes.invite_codes = pjsua_response_codes_for_method(outRes.log, "INVITE");
    outRes.register_codes = pjsua_response_codes_for_method(outRes.log, "REGISTER");
    return outRes.log;
}
} // namespace
#endif

[[maybe_unused]] static std::string patch_baresip_config_audio_source(const std::string& config, const std::string& wav_path)
{
    if (wav_path.empty()) return config;
    std::string out = config;

    // Ensure aufile module is loaded.
    if (out.find("aufile.so") == std::string::npos)
    {
        out += "\nmodule\t\taufile.so\n";
    }

    const std::string desired = "audio_source\t\taufile," + wav_path;

    // Replace existing audio_source line if present.
    size_t pos = out.find("\naudio_source");
    if (pos == std::string::npos && out.rfind("audio_source", 0) == 0) pos = 0;
    if (pos != std::string::npos)
    {
        size_t lineStart = (pos == 0) ? 0 : (pos + 1);
        size_t lineEnd = out.find('\n', lineStart);
        if (lineEnd == std::string::npos) lineEnd = out.size();
        out.replace(lineStart, lineEnd - lineStart, desired);
        return out;
    }

    // Otherwise append.
    out += "\n" + desired + "\n";
    return out;
}

[[maybe_unused]] static std::string tmp_audio_copy_path(const std::filesystem::path& tmpdir)
{
    return (tmpdir / "sip-audio.wav").string();
}

static bool copy_file_best_effort(const std::string& src, const std::string& dst, std::string& err)
{
    err.clear();
    if (src.empty() || dst.empty()) { err = "missing src/dst"; return false; }
    std::error_code ec;
    std::filesystem::copy_file(src, dst, std::filesystem::copy_options::overwrite_existing, ec);
    if (!ec) return true;
    // Try a manual copy (some filesystems/permissions may block copy_file metadata ops)
    try {
        std::ifstream in(src, std::ios::binary);
        if (!in) { err = "open src failed: " + src; return false; }
        std::ofstream out(dst, std::ios::binary | std::ios::trunc);
        if (!out) { err = "open dst failed: " + dst; return false; }
        out << in.rdbuf();
        if (!out) { err = "write dst failed: " + dst; return false; }
        return true;
    } catch (const std::exception& e) {
        err = e.what();
        return false;
    }
}

[[maybe_unused]] static std::string patch_baresip_config_module_path(const std::string& config)
{
    std::string out = config;
    const std::string desired = "module_path\t\t/usr/lib/baresip/modules";

    // If module_path is already set (commented or not), replace the first occurrence.
    size_t pos = out.find("\nmodule_path");
    if (pos == std::string::npos && out.rfind("module_path", 0) == 0) pos = 0;
    if (pos != std::string::npos)
    {
        size_t lineStart = (pos == 0) ? 0 : (pos + 1);
        size_t lineEnd = out.find('\n', lineStart);
        if (lineEnd == std::string::npos) lineEnd = out.size();
        out.replace(lineStart, lineEnd - lineStart, desired);
        return out;
    }

    // If only a commented module_path exists, replace that.
    pos = out.find("\n#module_path");
    if (pos == std::string::npos && out.rfind("#module_path", 0) == 0) pos = 0;
    if (pos != std::string::npos)
    {
        size_t lineStart = (pos == 0) ? 0 : (pos + 1);
        size_t lineEnd = out.find('\n', lineStart);
        if (lineEnd == std::string::npos) lineEnd = out.size();
        out.replace(lineStart, lineEnd - lineStart, desired);
        return out;
    }

    out += "\n" + desired + "\n";
    return out;
}

[[maybe_unused]] static std::string patch_baresip_config_headless_audio(const std::string& config)
{
    // Previous attempts to force a headless audio_player via `aufile,/dev/null`
    // caused baresip to error because aufile expects a real file. For now, leave
    // audio_player/audio_alert as-is and only override the audio_source when we
    // have a wav to inject.
    return config;
}

static bool command_exists(const std::string& name)
{
    if (name.empty()) return false;
    if (name.find('/') != std::string::npos) return ::access(name.c_str(), X_OK) == 0;
    const char* pathEnv = std::getenv("PATH");
    std::string paths = pathEnv ? pathEnv : "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
    size_t start = 0;
    while (start <= paths.size())
    {
        const size_t end = paths.find(':', start);
        const std::string dir = paths.substr(start, end == std::string::npos ? std::string::npos : end - start);
        if (!dir.empty() && ::access(join_path(dir, name).c_str(), X_OK) == 0) return true;
        if (end == std::string::npos) break;
        start = end + 1;
    }
    return false;
}

static std::string dirname_of(const std::string& path)
{
    const auto slash = path.find_last_of('/');
    if (slash == std::string::npos) return ".";
    if (slash == 0) return "/";
    return path.substr(0, slash);
}

static std::string resolve_audio_path(const std::string& configDir, const std::string& raw)
{
    std::string p = raw;
    if (p.empty()) return "";
    if (p.front() == '/') return p;
    if (p.rfind("audio/", 0) == 0) return join_path(configDir, p);
    return join_path(join_path(configDir, "audio"), p);
}

static std::optional<speed_t> modem_baud_to_speed(int baud)
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

class ModemSerialPort
{
public:
    ~ModemSerialPort()
    {
        if (fd_ >= 0) close(fd_);
    }

    bool open_port(const std::string& device, int baud, std::string& err)
    {
        auto speed = modem_baud_to_speed(baud);
        if (!speed) {
            err = "unsupported baud rate";
            return false;
        }

        fd_ = open(device.c_str(), O_RDWR | O_NOCTTY | O_NONBLOCK);
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
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
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

struct AlarmDb
{
    std::mutex mu;
    sqlite3* db = nullptr;
    std::string path;
    std::string last_error;

    bool is_open()
    {
        std::lock_guard<std::mutex> lock(mu);
        return db != nullptr;
    }

    json status_json()
    {
        std::lock_guard<std::mutex> lock(mu);
        json j;
        j["open"] = (db != nullptr);
        j["path"] = path;
        j["error"] = last_error.empty() ? nullptr : json(last_error);
        if (!db) return j;

        // Best-effort stats (do not fail status on SQL errors).
        auto scalar_i64 = [&](const char* sql) -> std::optional<int64_t> {
            sqlite3_stmt* stmt = nullptr;
            if (sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr) != SQLITE_OK) return std::nullopt;
            std::optional<int64_t> out;
            int rc = sqlite3_step(stmt);
            if (rc == SQLITE_ROW) out = sqlite3_column_int64(stmt, 0);
            sqlite3_finalize(stmt);
            return out;
        };

        if (auto c = scalar_i64("SELECT COUNT(*) FROM alarm_events;"); c.has_value()) j["row_count"] = c.value();
        if (auto t = scalar_i64("SELECT COALESCE(MAX(ts_ms),0) FROM alarm_events;"); t.has_value()) j["last_ts_ms"] = t.value();
        return j;
    }

    bool open_or_create(const std::string& dbPath, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        path = dbPath;
        last_error.clear();

        int rc = sqlite3_open(dbPath.c_str(), &db);
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            sqlite3_close(db);
            db = nullptr;
            return false;
        }

        auto exec_ignore = [&](const char* sql) {
            sqlite3_exec(db, sql, nullptr, nullptr, nullptr);
        };

        // Create base table if needed.
        {
            const char* sql = R"SQL(
                CREATE TABLE IF NOT EXISTS alarm_events (
                    event_id      TEXT PRIMARY KEY,
                    ts_ms         INTEGER NOT NULL,
                    alarm_id      TEXT NOT NULL,
                    type          TEXT NOT NULL,
                    severity      INTEGER NOT NULL,
                    connection_id TEXT NOT NULL,
                    tag           TEXT NOT NULL,
                    value_json    TEXT,
                    message       TEXT,
                    actor         TEXT,
                    note          TEXT
                );
            )SQL";

            char* errmsg = nullptr;
            rc = sqlite3_exec(db, sql, nullptr, nullptr, &errmsg);
            if (rc != SQLITE_OK)
            {
                err = errmsg ? errmsg : "schema error";
                last_error = err;
                sqlite3_free(errmsg);
                sqlite3_close(db);
                db = nullptr;
                return false;
            }
        }

        // Backward-compatible migrations (if DB existed before group/site columns).
        // Ignore errors (e.g., "duplicate column name") so we can start cleanly.
        exec_ignore("ALTER TABLE alarm_events ADD COLUMN group_name TEXT;");
        exec_ignore("ALTER TABLE alarm_events ADD COLUMN site TEXT;");

        // Indexes (best-effort; do not fail DB open if an index can't be created).
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_alarm_events_ts ON alarm_events(ts_ms);");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_alarm_events_alarm ON alarm_events(alarm_id, ts_ms);");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_alarm_events_tag ON alarm_events(connection_id, tag, ts_ms);");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_alarm_events_group_site ON alarm_events(group_name, site, ts_ms);");

        exec_ignore(R"SQL(
            CREATE TABLE IF NOT EXISTS notification_attempts (
                attempt_id   TEXT PRIMARY KEY,
                ts_ms        INTEGER NOT NULL,
                route_name   TEXT NOT NULL,
                route_type   TEXT NOT NULL,
                alarm_id     TEXT NOT NULL,
                severity     INTEGER NOT NULL,
                event_type   TEXT NOT NULL,
                ok           INTEGER NOT NULL,
                result       TEXT,
                command      TEXT
            );
        )SQL");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_notification_attempts_ts ON notification_attempts(ts_ms);");
        exec_ignore("CREATE INDEX IF NOT EXISTS idx_notification_attempts_alarm ON notification_attempts(alarm_id, ts_ms);");

        return true;
    }

    void close()
    {
        std::lock_guard<std::mutex> lock(mu);
        if (db)
        {
            sqlite3_close(db);
            db = nullptr;
        }
    }

    bool insert_event(const json& event, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        if (!db)
        {
            err = "DB not open";
            last_error = err;
            return false;
        }

        auto opt_string = [&](const char* key) -> std::string {
            if (!event.is_object() || !event.contains(key)) return "";
            const auto& v = event.at(key);
            if (v.is_string()) return v.get<std::string>();
            return "";
        };

        const char* sql_with_group_site = R"SQL(
            INSERT INTO alarm_events (
                event_id, ts_ms, alarm_id, type, severity, group_name, site, connection_id, tag,
                value_json, message, actor, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        )SQL";

        const char* sql_legacy = R"SQL(
            INSERT INTO alarm_events (
                event_id, ts_ms, alarm_id, type, severity, connection_id, tag,
                value_json, message, actor, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        )SQL";

        sqlite3_stmt* stmt = nullptr;
        bool useLegacy = false;
        int rc = sqlite3_prepare_v2(db, sql_with_group_site, -1, &stmt, nullptr);
        if (rc != SQLITE_OK)
        {
            const std::string e = sqlite3_errmsg(db);
            if (e.find("group_name") != std::string::npos || e.find("site") != std::string::npos)
            {
                useLegacy = true;
                rc = sqlite3_prepare_v2(db, sql_legacy, -1, &stmt, nullptr);
            }
        }
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            return false;
        }

        const std::string event_id = event.value("event_id", "");
        const int64_t ts_ms = event.value("ts_ms", 0LL);
        const std::string alarm_id = event.value("alarm_id", "");
        const std::string type = event.value("type", "");
        const int severity = event.value("severity", 0);
        const std::string group_name = opt_string("group");
        const std::string site = opt_string("site");
        const std::string connection_id = event.contains("source") ? event["source"].value("connection_id", "") : "";
        const std::string tag = event.contains("source") ? event["source"].value("tag", "") : "";
        const std::string value_json = event.contains("value") ? event["value"].dump() : "";
        const std::string message = opt_string("message");
        const std::string actor = opt_string("actor");
        const std::string note = opt_string("note");

        int idx = 1;
        sqlite3_bind_text(stmt, idx++, event_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(stmt, idx++, ts_ms);
        sqlite3_bind_text(stmt, idx++, alarm_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, idx++, type.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, idx++, severity);
        if (!useLegacy)
        {
            if (!group_name.empty()) sqlite3_bind_text(stmt, idx++, group_name.c_str(), -1, SQLITE_TRANSIENT);
            else sqlite3_bind_null(stmt, idx++);
            if (!site.empty()) sqlite3_bind_text(stmt, idx++, site.c_str(), -1, SQLITE_TRANSIENT);
            else sqlite3_bind_null(stmt, idx++);
        }
        sqlite3_bind_text(stmt, idx++, connection_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, idx++, tag.c_str(), -1, SQLITE_TRANSIENT);

        if (!value_json.empty()) sqlite3_bind_text(stmt, idx++, value_json.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        if (!message.empty()) sqlite3_bind_text(stmt, idx++, message.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        if (!actor.empty()) sqlite3_bind_text(stmt, idx++, actor.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        if (!note.empty()) sqlite3_bind_text(stmt, idx++, note.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        last_error.clear();
        return true;
    }

    bool insert_notification_attempt(const json& attempt, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        if (!db)
        {
            err = "DB not open";
            last_error = err;
            return false;
        }

        const char* sql = R"SQL(
            INSERT INTO notification_attempts (
                attempt_id, ts_ms, route_name, route_type, alarm_id, severity, event_type, ok, result, command
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        )SQL";

        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(db, sql, -1, &stmt, nullptr);
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            return false;
        }

        const std::string attempt_id = attempt.value("attempt_id", "");
        const std::string route_name = attempt.value("route_name", "");
        const std::string route_type = attempt.value("route_type", "");
        const std::string alarm_id = attempt.value("alarm_id", "");
        const std::string event_type = attempt.value("event_type", "");
        const std::string result = attempt.value("result", "");
        const std::string command = attempt.value("command", "");

        int idx = 1;
        sqlite3_bind_text(stmt, idx++, attempt_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(stmt, idx++, attempt.value("ts_ms", 0LL));
        sqlite3_bind_text(stmt, idx++, route_name.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, idx++, route_type.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, idx++, alarm_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, idx++, attempt.value("severity", 0));
        sqlite3_bind_text(stmt, idx++, event_type.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, idx++, attempt.value("ok", false) ? 1 : 0);
        if (!result.empty()) sqlite3_bind_text(stmt, idx++, result.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);
        if (!command.empty()) sqlite3_bind_text(stmt, idx++, command.c_str(), -1, SQLITE_TRANSIENT);
        else sqlite3_bind_null(stmt, idx++);

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        last_error.clear();
        return true;
    }

    bool fetch_events(const httplib::Request& req, json& out, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        out = json::array();
        if (!db)
        {
            err = "DB not open";
            last_error = err;
            return false;
        }

        int limit = 500;
        if (req.has_param("limit"))
        {
            try { limit = std::stoi(req.get_param_value("limit")); } catch (...) {}
        }
        if (limit < 1) limit = 1;
        if (limit > 50000) limit = 50000;

        auto parse_i64_param = [&](const char* name, int64_t& outVal) -> bool {
            if (!req.has_param(name)) return false;
            try {
                outVal = std::stoll(req.get_param_value(name));
                return true;
            } catch (...) {
                outVal = 0;
                return false;
            }
        };

        const bool has_since = req.has_param("since_ms");
        const bool has_until = req.has_param("until_ms");
        const bool has_alarm = req.has_param("alarm_id");
        const bool has_conn  = req.has_param("connection_id");
        const bool has_tag   = req.has_param("tag");
        const bool has_types = req.has_param("types");


std::vector<std::string> typeList;
if (has_types)
{
    std::string s = req.get_param_value("types");
    size_t start = 0;
    while (start < s.size())
    {
        size_t comma = s.find(',', start);
        if (comma == std::string::npos) comma = s.size();
        std::string part = s.substr(start, comma - start);
        if (!part.empty()) typeList.push_back(part);
        start = comma + 1;
    }
}


auto make_sql = [&](bool withGroupSite) -> std::string {
    std::string sql = withGroupSite
        ? "SELECT event_id, ts_ms, alarm_id, type, severity, group_name, site, connection_id, tag, value_json, message, actor, note "
        : "SELECT event_id, ts_ms, alarm_id, type, severity, connection_id, tag, value_json, message, actor, note ";
    sql += "FROM alarm_events WHERE 1=1 ";

    if (has_since) sql += "AND ts_ms >= ? ";
    if (has_until) sql += "AND ts_ms <= ? ";
    if (has_alarm) sql += "AND alarm_id = ? ";
    if (has_conn)  sql += "AND connection_id = ? ";
    if (has_tag)   sql += "AND tag = ? ";
    sql += "AND NOT (COALESCE(actor, '') = 'opcbridge-alarms' AND COALESCE(note, '') LIKE '%startup/reconnect reconciliation%') ";
    sql += "AND COALESCE(note, '') NOT LIKE '%inferred from current tag state%' ";

    if (!typeList.empty())
    {
        sql += "AND type IN (";
        for (size_t i = 0; i < typeList.size(); i++)
        {
            sql += (i == 0 ? "?" : ",?");
        }
        sql += ") ";
    }

    sql += "ORDER BY ts_ms DESC LIMIT ?;";
    return sql;
};


        bool withGroupSite = true;
        std::string sql = make_sql(withGroupSite);

        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);

        if (rc != SQLITE_OK)
        {
            // Backward compatibility: older DBs may not have group_name/site columns.
            const std::string e = sqlite3_errmsg(db);
            if (e.find("no such column") != std::string::npos || e.find("has no column") != std::string::npos)
            {
                withGroupSite = false;
                sql = make_sql(withGroupSite);
                rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
            }
        }

        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            return false;
        }

        int idx = 1;
        if (has_since) {
            int64_t v = 0;
            if (!parse_i64_param("since_ms", v)) { sqlite3_finalize(stmt); err = "Invalid since_ms"; return false; }
            sqlite3_bind_int64(stmt, idx++, v);
        }
        if (has_until) {
            int64_t v = 0;
            if (!parse_i64_param("until_ms", v)) { sqlite3_finalize(stmt); err = "Invalid until_ms"; return false; }
            sqlite3_bind_int64(stmt, idx++, v);
        }
        if (has_alarm) sqlite3_bind_text(stmt, idx++, req.get_param_value("alarm_id").c_str(), -1, SQLITE_TRANSIENT);
        if (has_conn)  sqlite3_bind_text(stmt, idx++, req.get_param_value("connection_id").c_str(), -1, SQLITE_TRANSIENT);
        if (has_tag)   sqlite3_bind_text(stmt, idx++, req.get_param_value("tag").c_str(), -1, SQLITE_TRANSIENT);
        for (const auto& t : typeList)
        {
            sqlite3_bind_text(stmt, idx++, t.c_str(), -1, SQLITE_TRANSIENT);
        }
        sqlite3_bind_int(stmt, idx++, limit);

        while ((rc = sqlite3_step(stmt)) == SQLITE_ROW)
        {
            json ev;
            ev["event_id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
            ev["ts_ms"] = sqlite3_column_int64(stmt, 1);
            ev["alarm_id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            ev["type"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            ev["severity"] = sqlite3_column_int(stmt, 4);

            const int col_group = withGroupSite ? 5 : -1;
            const int col_site = withGroupSite ? 6 : -1;
            const int col_conn = withGroupSite ? 7 : 5;
            const int col_tag  = withGroupSite ? 8 : 6;
            const int col_val  = withGroupSite ? 9 : 7;
            const int col_msg  = withGroupSite ? 10 : 8;
            const int col_actor= withGroupSite ? 11 : 9;
            const int col_note = withGroupSite ? 12 : 10;

            if (withGroupSite)
            {
                if (sqlite3_column_type(stmt, col_group) == SQLITE_NULL) ev["group"] = "";
                else ev["group"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_group));

                if (sqlite3_column_type(stmt, col_site) == SQLITE_NULL) ev["site"] = "";
                else ev["site"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_site));
            }
            else
            {
                ev["group"] = "";
                ev["site"] = "";
            }

            ev["source"] = {
                {"connection_id", reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_conn))},
                {"tag", reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_tag))}
            };

            if (sqlite3_column_type(stmt, col_val) == SQLITE_NULL) ev["value"] = nullptr;
            else
            {
                const char* v = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_val));
                try { ev["value"] = json::parse(v); } catch (...) { ev["value"] = v; }
            }

            if (sqlite3_column_type(stmt, col_msg) == SQLITE_NULL) ev["message"] = nullptr;
            else ev["message"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_msg));

            if (sqlite3_column_type(stmt, col_actor) == SQLITE_NULL) ev["actor"] = nullptr;
            else ev["actor"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_actor));

            if (sqlite3_column_type(stmt, col_note) == SQLITE_NULL) ev["note"] = nullptr;
            else ev["note"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_note));

            out.push_back(ev);
        }

        if (rc != SQLITE_DONE)
        {
            err = sqlite3_errmsg(db);
            last_error = err;
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        last_error.clear();
        return true;
    }

    bool fetch_events_since(int64_t since_ms, int limit, json& out, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        out = json::array();
        if (!db)
        {
            err = "DB not open";
            return false;
        }

        if (limit < 1) limit = 1;
        if (limit > 50000) limit = 50000;

        auto make_sql = [&](bool withGroupSite) -> std::string {
            std::string sql = withGroupSite
                ? "SELECT event_id, ts_ms, alarm_id, type, severity, group_name, site, connection_id, tag, value_json, message, actor, note "
                : "SELECT event_id, ts_ms, alarm_id, type, severity, connection_id, tag, value_json, message, actor, note ";
            sql += "FROM alarm_events WHERE ts_ms >= ? ORDER BY ts_ms ASC LIMIT ?;";
            return sql;
        };

        bool withGroupSite = true;
        std::string sql = make_sql(withGroupSite);
        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
        if (rc != SQLITE_OK)
        {
            // Backward compatibility: older DBs may not have group_name/site columns.
            const std::string e = sqlite3_errmsg(db);
            if (e.find("no such column") != std::string::npos || e.find("has no column") != std::string::npos)
            {
                withGroupSite = false;
                sql = make_sql(withGroupSite);
                rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
            }
        }
        if (rc != SQLITE_OK)
        {
            err = sqlite3_errmsg(db);
            return false;
        }

        int idx = 1;
        sqlite3_bind_int64(stmt, idx++, since_ms);
        sqlite3_bind_int(stmt, idx++, limit);

        while ((rc = sqlite3_step(stmt)) == SQLITE_ROW)
        {
            int col = 0;
            const int col_event_id = col++;
            const int col_ts       = col++;
            const int col_alarm_id  = col++;
            const int col_type      = col++;
            const int col_sev       = col++;
            const int col_group     = withGroupSite ? col++ : -1;
            const int col_site      = withGroupSite ? col++ : -1;
            const int col_conn      = col++;
            const int col_tag       = col++;
            const int col_val       = col++;
            const int col_msg       = col++;
            const int col_actor     = col++;
            const int col_note      = col++;

            json ev;
            ev["event_id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_event_id));
            ev["ts_ms"] = sqlite3_column_int64(stmt, col_ts);
            ev["alarm_id"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_alarm_id));
            ev["type"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_type));
            ev["severity"] = sqlite3_column_int(stmt, col_sev);

            if (withGroupSite)
            {
                if (sqlite3_column_type(stmt, col_group) == SQLITE_NULL) ev["group"] = "";
                else ev["group"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_group));
                if (sqlite3_column_type(stmt, col_site) == SQLITE_NULL) ev["site"] = "";
                else ev["site"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_site));
            }

            ev["source"] = {
                {"connection_id", reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_conn))},
                {"tag", reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_tag))}
            };

            if (sqlite3_column_type(stmt, col_val) == SQLITE_NULL) ev["value"] = nullptr;
            else
            {
                const char* v = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_val));
                try { ev["value"] = json::parse(v); } catch (...) { ev["value"] = v; }
            }

            if (sqlite3_column_type(stmt, col_msg) == SQLITE_NULL) ev["message"] = nullptr;
            else ev["message"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_msg));

            if (sqlite3_column_type(stmt, col_actor) == SQLITE_NULL) ev["actor"] = nullptr;
            else ev["actor"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_actor));

            if (sqlite3_column_type(stmt, col_note) == SQLITE_NULL) ev["note"] = nullptr;
            else ev["note"] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col_note));

            out.push_back(ev);
        }

        if (rc != SQLITE_DONE)
        {
            err = sqlite3_errmsg(db);
            sqlite3_finalize(stmt);
            return false;
        }

        sqlite3_finalize(stmt);
        return true;
    }
};

struct AlarmWs
{
    std::mutex mu;
    std::shared_ptr<WebSocketServer> server;
    std::unordered_map<std::string, std::weak_ptr<ix::WebSocket>> clientsById;
    std::atomic<bool> enabled{false};
    std::atomic<uint64_t> clients{0};

    std::function<json()> build_snapshot;

    bool start(uint16_t port, std::string& err)
    {
        std::lock_guard<std::mutex> lock(mu);
        if (server)
        {
            enabled.store(true);
            return true;
        }

        server = std::make_shared<WebSocketServer>(port, "0.0.0.0");

        server->setOnConnectionCallback([this](std::weak_ptr<ix::WebSocket> wsWeak,
                                               std::shared_ptr<ix::ConnectionState> connectionState)
        {
            if (!connectionState) return;
            auto ws = wsWeak.lock();
            if (!ws) return;
            const std::string id = connectionState->getId();

            {
                std::lock_guard<std::mutex> lock(mu);
                clientsById[id] = wsWeak;
                clients.store(clientsById.size());
            }

            ws->setOnMessageCallback([this, connectionState](const ix::WebSocketMessagePtr& msg) {
                if (!msg) return;
                if (msg->type == ix::WebSocketMessageType::Open)
                {
                    // Send snapshot on connect.
                    if (build_snapshot)
                    {
                        json snap;
                        try { snap = build_snapshot(); } catch (...) { snap = json::object(); }
                        try {
                            ws_broadcast_one(connectionState, snap);
                        } catch (...) {}
                    }
                    return;
                }
                if (msg->type == ix::WebSocketMessageType::Close || msg->type == ix::WebSocketMessageType::Error)
                {
                    const std::string cid = connectionState ? connectionState->getId() : "";
                    if (!cid.empty())
                    {
                        std::lock_guard<std::mutex> lock(mu);
                        clientsById.erase(cid);
                        clients.store(clientsById.size());
                    }
                    return;
                }
                // Ignore messages for now (future: subscribe filters)
            });
        });

        auto res = server->listen();
        if (!res.first)
        {
            err = res.second;
            server.reset();
            enabled.store(false);
            return false;
        }

        server->disablePerMessageDeflate();
        server->start();
        enabled.store(true);
        return true;
    }

    void stop()
    {
        std::lock_guard<std::mutex> lock(mu);
        if (server)
        {
            server->stop();
            server.reset();
        }
        clientsById.clear();
        clients.store(0);
        enabled.store(false);
    }

    void broadcast(const json& msg)
    {
        std::vector<std::shared_ptr<ix::WebSocket>> sockets;
        {
            std::lock_guard<std::mutex> lock(mu);
            sockets.reserve(clientsById.size());
            for (auto it = clientsById.begin(); it != clientsById.end(); )
            {
                auto ws = it->second.lock();
                if (!ws)
                {
                    it = clientsById.erase(it);
                    continue;
                }
                sockets.push_back(ws);
                ++it;
            }
            clients.store(clientsById.size());
        }

        if (sockets.empty()) return;
        const std::string payload = msg.dump();
        for (auto& ws : sockets)
        {
            ws->send(payload);
        }
    }

private:
    void ws_broadcast_one(const std::shared_ptr<ix::ConnectionState>& connectionState, const json& msg)
    {
        if (!connectionState) return;
        std::shared_ptr<ix::WebSocket> ws;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = clientsById.find(connectionState->getId());
            if (it == clientsById.end()) return;
            ws = it->second.lock();
        }
        if (!ws) return;
        ws->send(msg.dump());
    }
};

struct AlarmRule
{
    std::string id;
    std::string name;
    std::string group;
    std::string site;
    bool enabled = true;
    bool site_enabled = true;
    int severity = 500;
    std::string connection_id;
    std::string tag;
    std::string condition_type; // "equals" | "not_equals" | "high" | "low"
    json condition_value;       // used for equals/not_equals
    double threshold = 0.0;     // used for high/low
    double hysteresis = 0.0;    // used for high/low
    int64_t delay_ms = 0;       // activation persistence delay
    std::string message_on_active;
    std::string message_on_return;
    bool audible_enabled = false;
    std::string audio_file;
    std::string audio_path;
    std::string speech_text;
    std::vector<std::string> audio_files;
    std::vector<std::string> audio_paths;
    std::vector<std::string> speech_texts;
    int audio_gap_ms = -1;
    std::string audio_mode = "audio_then_speech";
    std::string notification_policy;

    // Repeat behavior for audible notifications.
    // If repeat_override is false, fall back to the notification route default repeat_ms.
    // If true, repeat_ms may be 0 (explicit off) or >0 (repeat interval).
    bool repeat_override = false;
    int64_t repeat_ms = 0;
};

struct AlarmState
{
    std::string alarm_id;
    std::string name;
    std::string group;
    std::string site;
    int severity = 500;
    bool enabled = true;
    bool site_enabled = true;

    bool active = false;
    bool acked = false;
    bool initialized = false;
    bool return_notification_armed = false;
    bool pending = false;
    bool pending_record_event = false;
    int64_t pending_since_ms = 0;
    int64_t effective_delay_ms = 0;
    std::optional<int64_t> shelved_until_ms;

    int64_t active_since_ms = 0;
    int64_t last_change_ms = 0;

    std::string connection_id;
    std::string tag;
    json last_value;
    std::string message;

    // Operator-facing configured messages (copied from rule)
    std::string message_on_active;
    std::string message_on_return;
    bool audible_enabled = false;
    std::string audio_file;
    std::string audio_path;
    std::string speech_text;
    std::vector<std::string> audio_files;
    std::vector<std::string> audio_paths;
    std::vector<std::string> speech_texts;
    int audio_gap_ms = -1;
    std::string audio_mode = "audio_then_speech";
    std::string notification_policy;

    // Repeat behavior for audible notifications.
    // If repeat_override is false, fall back to the notification route default repeat_ms.
    // If true, repeat_ms may be 0 (explicit off) or >0 (repeat interval).
    bool repeat_override = false;
    int64_t repeat_ms = 0;
};

static json alarm_state_to_json(const AlarmState &s)
{
    json j;
    j["alarm_id"] = s.alarm_id;
    j["name"] = s.name;
    j["group"] = s.group;
    j["site"] = s.site;
    j["severity"] = s.severity;
    j["enabled"] = s.enabled;
    j["site_enabled"] = s.site_enabled;
    j["active"] = s.active;
    j["acked"] = s.acked;
    j["return_notification_armed"] = s.return_notification_armed;
    j["pending"] = s.pending;
    j["pending_since_ms"] = s.pending ? s.pending_since_ms : 0;
    j["effective_delay_ms"] = s.effective_delay_ms;
    j["pending_remaining_ms"] = s.pending
        ? std::max<int64_t>(0, s.effective_delay_ms - (now_ms() - s.pending_since_ms))
        : 0;
    if (s.shelved_until_ms.has_value())
        j["shelved_until_ms"] = s.shelved_until_ms.value();
    else
        j["shelved_until_ms"] = nullptr;
    j["active_since_ms"] = s.active_since_ms;
    j["last_change_ms"] = s.last_change_ms;
    j["source"] = {{"connection_id", s.connection_id}, {"tag", s.tag}};
    j["last_value"] = s.last_value;
    j["message"] = s.message;
    j["message_on_active"] = s.message_on_active;
    j["message_on_return"] = s.message_on_return;
    j["audible_enabled"] = s.audible_enabled;
    j["audio_file"] = s.audio_file.empty() ? nullptr : json(s.audio_file);
    j["audio_path"] = s.audio_path.empty() ? nullptr : json(s.audio_path);
    j["speech_text"] = s.speech_text.empty() ? nullptr : json(s.speech_text);
    j["audio_files"] = s.audio_files;
    j["audio_paths"] = s.audio_paths;
    j["speech_texts"] = s.speech_texts;
    j["audio_gap_ms"] = s.audio_gap_ms;
    j["audio_mode"] = s.audio_mode;
    j["notification_policy"] = s.notification_policy.empty() ? nullptr : json(s.notification_policy);
    j["repeat_override"] = s.repeat_override;
    j["repeat_ms"] = s.repeat_ms;
    return j;
}

struct ResolvedAlarmAudio
{
    bool audible_enabled = false;
    std::string audio_file;
    std::string audio_path;
    std::string speech_text;
    std::vector<std::string> audio_files;
    std::vector<std::string> audio_paths;
    std::vector<std::string> speech_texts;
    int audio_gap_ms = -1;
    std::string audio_mode = "audio_then_speech";
};

struct ResolvedAlarmRepeat
{
    bool repeat_override = false;
    int64_t repeat_ms = 0;
};

static std::string json_string_or_empty(const json& obj, const char* key)
{
    if (!obj.is_object() || !obj.contains(key) || !obj[key].is_string()) return "";
    return obj[key].get<std::string>();
}

static void append_audio_file(std::vector<std::string>& files, const std::string& file)
{
    if (file.empty()) return;
    files.push_back(file);
}

static void append_speech_text(std::vector<std::string>& texts, const std::string& text)
{
    if (text.empty()) return;
    texts.push_back(text);
}

static void apply_audio_scope(const json& scope, bool& audible, std::string& audioFile, std::vector<std::string>& audioFiles, std::string& speechText, std::vector<std::string>& speechTexts, int& audioGapMs, std::string& audioMode)
{
    if (!scope.is_object()) return;
    if (scope.contains("audible_enabled") && scope["audible_enabled"].is_boolean())
    {
        audible = scope["audible_enabled"].get<bool>();
    }
    if (scope.contains("audio_gap_ms") && scope["audio_gap_ms"].is_number_integer())
    {
        audioGapMs = std::max(0, std::min(5000, scope["audio_gap_ms"].get<int>()));
    }
    if (scope.contains("audio_mode") && scope["audio_mode"].is_string())
    {
        std::string mode = scope["audio_mode"].get<std::string>();
        if (mode == "audio_only" || mode == "speech_only" || mode == "audio_then_speech" || mode == "speech_then_audio")
        {
            audioMode = mode;
        }
    }
    const std::string file = json_string_or_empty(scope, "audio_file");
    bool hasAudioFilesArray = scope.contains("audio_files") && scope["audio_files"].is_array();
    if (!file.empty()) {
        audioFile = file;
        if (!hasAudioFilesArray) append_audio_file(audioFiles, file);
    }
    if (hasAudioFilesArray)
    {
        bool setDefaultFromList = audioFile.empty();
        for (const auto& fv : scope["audio_files"])
        {
            if (!fv.is_string()) continue;
            const std::string f = fv.get<std::string>();
            if (f.empty()) continue;
            append_audio_file(audioFiles, f);
            if (setDefaultFromList)
            {
                audioFile = f;
                setDefaultFromList = false;
            }
        }
    }
    const std::string text = json_string_or_empty(scope, "speech_text");
    if (!text.empty()) {
        speechText = text;
        append_speech_text(speechTexts, text);
    }
    if (scope.contains("speech_texts") && scope["speech_texts"].is_array())
    {
        bool setDefaultTextFromList = speechText.empty();
        for (const auto& tv : scope["speech_texts"])
        {
            if (!tv.is_string()) continue;
            const std::string t = tv.get<std::string>();
            if (t.empty()) continue;
            append_speech_text(speechTexts, t);
            if (setDefaultTextFromList)
            {
                speechText = t;
                setDefaultTextFromList = false;
            }
        }
    }
}

static ResolvedAlarmAudio resolve_alarm_audio(const json& root, const json& rule, const std::string& configDir)
{
    ResolvedAlarmAudio out;
    std::unordered_map<std::string, std::string> audioPaths;

    const json audio = (root.contains("audio") && root["audio"].is_object()) ? root["audio"] : json::object();
    if (audio.contains("audible_enabled") && audio["audible_enabled"].is_boolean())
    {
        out.audible_enabled = audio["audible_enabled"].get<bool>();
    }
    if (audio.contains("default_file") && audio["default_file"].is_string())
    {
        out.audio_file = audio["default_file"].get<std::string>();
        append_audio_file(out.audio_files, out.audio_file);
    }
    if (audio.contains("speech_text") && audio["speech_text"].is_string())
    {
        out.speech_text = audio["speech_text"].get<std::string>();
        append_speech_text(out.speech_texts, out.speech_text);
    }
    if (audio.contains("files") && audio["files"].is_array())
    {
        for (const auto& f : audio["files"])
        {
            if (!f.is_object()) continue;
            const std::string id = json_string_or_empty(f, "id");
            if (id.empty()) continue;
            std::string path = json_string_or_empty(f, "path");
            if (path.empty()) path = id;
            audioPaths[id] = path;
        }
    }

    const std::string groupName = json_string_or_empty(rule, "group");
    const std::string siteName = json_string_or_empty(rule, "site");
    if (root.contains("groups") && root["groups"].is_array())
    {
        for (const auto& g : root["groups"])
        {
            if (!g.is_object() || json_string_or_empty(g, "name") != groupName) continue;
            apply_audio_scope(g, out.audible_enabled, out.audio_file, out.audio_files, out.speech_text, out.speech_texts, out.audio_gap_ms, out.audio_mode);
            if (!siteName.empty() && g.contains("sites") && g["sites"].is_array())
            {
                for (const auto& s : g["sites"])
                {
                    if (!s.is_object() || json_string_or_empty(s, "name") != siteName) continue;
                    apply_audio_scope(s, out.audible_enabled, out.audio_file, out.audio_files, out.speech_text, out.speech_texts, out.audio_gap_ms, out.audio_mode);
                    break;
                }
            }
            break;
        }
    }

    apply_audio_scope(rule, out.audible_enabled, out.audio_file, out.audio_files, out.speech_text, out.speech_texts, out.audio_gap_ms, out.audio_mode);
    if (out.audio_mode == "audio_only")
    {
        out.speech_text.clear();
        out.speech_texts.clear();
    }
    else if (out.audio_mode == "speech_only")
    {
        out.audio_file.clear();
        out.audio_path.clear();
        out.audio_files.clear();
        out.audio_paths.clear();
    }

    if (!out.audio_file.empty())
    {
        const auto it = audioPaths.find(out.audio_file);
        const std::string configuredPath = (it == audioPaths.end()) ? out.audio_file : it->second;
        out.audio_path = resolve_audio_path(configDir, configuredPath);
    }
    for (const auto& file : out.audio_files)
    {
        const auto it = audioPaths.find(file);
        const std::string configuredPath = (it == audioPaths.end()) ? file : it->second;
        out.audio_paths.push_back(resolve_audio_path(configDir, configuredPath));
    }
    return out;
}

static bool resolve_alarm_site_enabled(const json& root, const json& rule)
{
    const std::string groupName = json_string_or_empty(rule, "group");
    const std::string siteName = json_string_or_empty(rule, "site");
    if (groupName.empty() || siteName.empty()) return true;
    if (!root.contains("groups") || !root["groups"].is_array()) return true;

    for (const auto& g : root["groups"])
    {
        if (!g.is_object() || json_string_or_empty(g, "name") != groupName) continue;
        if (!g.contains("sites") || !g["sites"].is_array()) return true;
        for (const auto& s : g["sites"])
        {
            if (!s.is_object() || json_string_or_empty(s, "name") != siteName) continue;
            if (s.contains("alarms_enabled") && s["alarms_enabled"].is_boolean())
            {
                return s["alarms_enabled"].get<bool>();
            }
            return true;
        }
        return true;
    }
    return true;
}

static ResolvedAlarmRepeat resolve_alarm_repeat(const json& root, const json& rule)
{
    ResolvedAlarmRepeat out;
    const std::string groupName = json_string_or_empty(rule, "group");
    const std::string siteName = json_string_or_empty(rule, "site");

    auto apply = [&](const json& obj) {
        if (!obj.is_object()) return;
        if (!obj.contains("repeat_ms")) return;
        const json& v = obj["repeat_ms"];
        if (!v.is_number()) return;
        out.repeat_override = true;
        if (v.is_number_integer()) out.repeat_ms = v.get<int64_t>();
        else out.repeat_ms = static_cast<int64_t>(v.get<double>());
    };

    if (root.contains("groups") && root["groups"].is_array())
    {
        for (const auto& g : root["groups"])
        {
            if (!g.is_object() || json_string_or_empty(g, "name") != groupName) continue;
            apply(g);
            if (!siteName.empty() && g.contains("sites") && g["sites"].is_array())
            {
                for (const auto& s : g["sites"])
                {
                    if (!s.is_object() || json_string_or_empty(s, "name") != siteName) continue;
                    apply(s);
                    break;
                }
            }
            break;
        }
    }

    apply(rule);
    if (out.repeat_ms < 0) out.repeat_ms = 0;
    return out;
}

static bool validate_supported_config(const json& root, std::string& err)
{
    // Single-schema: keep validation permissive. The runtime defaults missing fields and ignores unknowns.
    // We only fail if the root isn't an object.
    (void)err;
    return root.is_object();
}

static json notification_config_from_root_current(const json& v2Root)
{
    json cfg = {
        {"enabled", true},
        {"timezone", v2Root.value("timezone", "")},
        {"schedules", v2Root.contains("schedules") && v2Root["schedules"].is_array() ? v2Root["schedules"] : json::array()},
        {"alarm_groups", v2Root.contains("alarm_groups") && v2Root["alarm_groups"].is_array() ? v2Root["alarm_groups"] : json::array()},
        {"routes", json::array()},
        {"contacts", json::array()},
        {"contact_groups", json::array()},
        {"policies", json::array()}
    };

    if (v2Root.contains("audio") && v2Root["audio"].is_object())
    {
        cfg["audio"] = v2Root["audio"];
    }

    // Shared TTS settings live at the config root (configured via SCADA "Configure Server").
    if (v2Root.contains("tts") && v2Root["tts"].is_object())
    {
        cfg["tts"] = v2Root["tts"];
    }

    // SIP settings live at the config root (configured via SCADA "Configure Server").
    if (v2Root.contains("sip") && v2Root["sip"].is_object())
    {
        cfg["sip"] = v2Root["sip"];
    }
    if (v2Root.contains("smtp") && v2Root["smtp"].is_object())
    {
        cfg["smtp"] = v2Root["smtp"];
    }

    std::unordered_map<std::string, json> targetById;
    if (v2Root.contains("targets") && v2Root["targets"].is_array())
    {
        for (const auto& t : v2Root["targets"])
        {
            if (!t.is_object()) continue;
            const std::string id = t.value("id", "");
            const std::string type = t.value("type", "");
            if (id.empty() || type.empty()) continue;
            targetById[id] = t;

            if (type == "phone" && t.value("enabled", true))
            {
                json contact = {
                    {"id", id},
                    {"name", t.value("name", id)},
                    {"phone", t.value("value", "")},
                    {"phone_home", t.value("phone_home", "")},
                    {"phone_work", t.value("phone_work", "")},
                    {"phone_cell", t.value("phone_cell", "")},
                    {"email", t.value("email", "")},
                    {"enabled", t.value("enabled", true)}
                };
                if (contact["phone_cell"].get<std::string>().empty()) contact["phone_cell"] = t.value("cell", "");
                if (contact["phone_home"].get<std::string>().empty()) contact["phone_home"] = t.value("home", "");
                if (contact["phone_work"].get<std::string>().empty()) contact["phone_work"] = t.value("work", "");
                if (contact["phone"].get<std::string>().empty())
                {
                    const std::string cell = contact["phone_cell"].get<std::string>();
                    const std::string work = contact["phone_work"].get<std::string>();
                    const std::string home = contact["phone_home"].get<std::string>();
                    contact["phone"] = !cell.empty() ? cell : (!work.empty() ? work : home);
                }
                if (t.contains("audio_delay_seconds") && t["audio_delay_seconds"].is_number_integer())
                {
                    contact["audio_delay_seconds"] = t["audio_delay_seconds"];
                }
                cfg["contacts"].push_back(std::move(contact));
            }
            else if (type == "group")
            {
                json g = {
                    {"id", id},
                    {"name", t.value("name", id)},
                    {"enabled", t.value("enabled", true)},
                    {"contacts", json::array()}
                };
                if (t.contains("members") && t["members"].is_array())
                {
                    for (const auto& member : t["members"])
                    {
                        if (!member.is_string()) continue;
                        const std::string m = member.get<std::string>();
                        auto itMember = targetById.find(m);
                        if (itMember != targetById.end() && itMember->second.value("type", "") == "phone")
                        {
                            g["contacts"].push_back(m);
                        }
                    }
                }
                cfg["contact_groups"].push_back(std::move(g));
            }
        }
    }

    std::unordered_map<std::string, json> routeById;
    if (v2Root.contains("routes") && v2Root["routes"].is_array())
    {
        for (const auto& r : v2Root["routes"])
        {
            if (!r.is_object()) continue;
            const std::string id = r.value("id", "");
            const std::string type = r.value("type", "");
            if (id.empty() || type.empty()) continue;
            routeById[id] = r;

            if (type == "voice_modem")
            {
                json vm = r.contains("config") && r["config"].is_object() ? r["config"] : json::object();
                vm["enabled"] = r.value("enabled", true);
                cfg["voice_modem"] = vm;
            }
            else if (type == "audio_command")
            {
                // Support both shapes:
                // - canonical/simple: {command,args} at the route root (what SCADA writes)
                // - legacy/compat:    {config:{command,args}} nested
                //
                // Prefer the top-level fields when present so device-specific args (e.g. `-D plughw:*`)
                // are not lost when a route also carries a `config` block for backward compatibility.
                const json routeCfg = r.contains("config") && r["config"].is_object() ? r["config"] : json::object();

                const bool hasTopCmd = r.contains("command") && r["command"].is_string();
                const bool hasCfgCmd = routeCfg.contains("command") && routeCfg["command"].is_string();
                if (!hasTopCmd && !hasCfgCmd) continue;

                const std::string cmd = hasTopCmd ? r["command"].get<std::string>() : routeCfg.value("command", std::string("/usr/bin/aplay"));
                json args = json::array({"{audio_path}"});
                if (r.contains("args") && r["args"].is_array()) args = r["args"];
                else if (routeCfg.contains("args") && routeCfg["args"].is_array()) args = routeCfg["args"];

                cfg["routes"].push_back({
                    {"name", r.value("name", id)},
                    {"type", "audio_command"},
                    {"enabled", r.value("enabled", true)},
                    {"min_severity", 0},
                    {"on", json::array({"active"})},
                    {"command", cmd.empty() ? std::string("/usr/bin/aplay") : cmd},
                    {"args", std::move(args)},
                    {"repeat_ms", 0},
                    {"repeat_initial_delay_ms", 0},
                    {"until", "acked_or_returned"},
                    {"schedule_id", "always"}
                });
            }
        }
    }

    if (v2Root.contains("policies") && v2Root["policies"].is_array())
    {
        for (const auto& p : v2Root["policies"])
        {
            if (!p.is_object()) continue;
            const std::string policyId = p.value("id", "");
            if (policyId.empty()) continue;
            const bool policyEnabled = p.value("enabled", true);

            std::vector<std::string> triggers{"active"};
            if (p.contains("triggers") && p["triggers"].is_array() && !p["triggers"].empty())
            {
                triggers.clear();
                for (const auto& ev : p["triggers"])
                {
                    if (ev.is_string()) triggers.push_back(ev.get<std::string>());
                }
            }
            else if (p.contains("on") && p["on"].is_array() && !p["on"].empty())
            {
                triggers.clear();
                for (const auto& ev : p["on"])
                {
                    if (ev.is_string()) triggers.push_back(ev.get<std::string>());
                }
            }

            int64_t repeatMs = 0;
            int64_t initialDelayMs = 0;
            int maxRepeats = 0;
            std::string until = "acked_or_returned";
            if (p.contains("repeat") && p["repeat"].is_object())
            {
                const auto& rep = p["repeat"];
                const bool repEnabled = rep.value("enabled", false);
                // Treat max_repeats=0 as "repeat indefinitely" (common/expected UX),
                // since the runtime doesn't currently enforce a max repeat count.
                if (repEnabled) repeatMs = std::max<int64_t>(1, rep.value("interval_ms", 60000LL));
                initialDelayMs = std::max<int64_t>(0, rep.value("initial_delay_ms", 0LL));
                maxRepeats = std::max(0, std::min(1000000, static_cast<int>(rep.value("max_repeats", 0LL))));
                until = rep.value("stop_on", until);
            }
            else
            {
                // Backward-compatible: allow simplified v2 policy objects to still
                // provide legacy repeat fields directly (repeat_ms/until/etc).
                // This also makes missing/partial UI migrations less brittle.
                if (p.contains("repeat_ms") && p["repeat_ms"].is_number())
                {
                    if (p["repeat_ms"].is_number_integer()) repeatMs = p["repeat_ms"].get<int64_t>();
                    else repeatMs = static_cast<int64_t>(p["repeat_ms"].get<double>());
                    if (repeatMs < 0) repeatMs = 0;
                }
                if (p.contains("repeat_initial_delay_ms") && p["repeat_initial_delay_ms"].is_number())
                {
                    if (p["repeat_initial_delay_ms"].is_number_integer()) initialDelayMs = p["repeat_initial_delay_ms"].get<int64_t>();
                    else initialDelayMs = static_cast<int64_t>(p["repeat_initial_delay_ms"].get<double>());
                    if (initialDelayMs < 0) initialDelayMs = 0;
                }
                if (p.contains("max_repeats") && p["max_repeats"].is_number_integer())
                {
                    maxRepeats = std::max(0, std::min(1000000, p["max_repeats"].get<int>()));
                }
                if (p.contains("until") && p["until"].is_string())
                {
                    until = p["until"].get<std::string>();
                }
            }
            const std::string scheduleId = p.value("schedule_id", "");

            // New simplified v2 policy shape used by SCADA (no steps/routes),
            // where alarm_groups carry policy assignments.
            if ((!p.contains("steps") || !p["steps"].is_array()) &&
                (p.contains("output_type") || p.contains("on") || p.contains("contact_groups") || p.contains("contacts")))
            {
                json normalized = {
                    {"id", policyId},
                    {"name", p.value("name", policyId)},
                    {"enabled", policyEnabled},
                    {"min_severity", p.value("min_severity", 0)},
                    {"on", triggers},
                    {"schedule_id", scheduleId.empty() ? "always" : scheduleId},
                    {"output_type", p.value("output_type", p.value("type", std::string("phone")))}
                };
                if (normalized["output_type"].is_string() && normalized["output_type"].get<std::string>() == "voice")
                {
                    normalized["output_type"] = "phone";
                }
                if (p.contains("contacts") && p["contacts"].is_array()) normalized["contacts"] = p["contacts"];
                if (p.contains("contact_groups") && p["contact_groups"].is_array()) normalized["contact_groups"] = p["contact_groups"];
                if (p.contains("targets") && p["targets"].is_array()) normalized["targets"] = p["targets"];
                if (p.contains("call_backend") && p["call_backend"].is_string()) normalized["call_backend"] = p["call_backend"];
                if (p.contains("ack_dtmf")) normalized["ack_dtmf"] = p["ack_dtmf"];
                if (p.contains("ack_wait_sec") && p["ack_wait_sec"].is_number_integer()) normalized["ack_wait_sec"] = p["ack_wait_sec"];
                if (p.contains("ring_timeout_sec") && p["ring_timeout_sec"].is_number_integer()) normalized["ring_timeout_sec"] = p["ring_timeout_sec"];
                if (p.contains("audio_delay_seconds") && p["audio_delay_seconds"].is_number_integer()) normalized["audio_delay_seconds"] = p["audio_delay_seconds"];
                if (p.contains("audio_gap_ms") && p["audio_gap_ms"].is_number_integer()) normalized["audio_gap_ms"] = p["audio_gap_ms"];
                if (p.contains("email_subject_template") && p["email_subject_template"].is_string()) normalized["email_subject_template"] = p["email_subject_template"];
                if (p.contains("email_active_body_template") && p["email_active_body_template"].is_string()) normalized["email_active_body_template"] = p["email_active_body_template"];
                if (p.contains("email_clear_body_template") && p["email_clear_body_template"].is_string()) normalized["email_clear_body_template"] = p["email_clear_body_template"];
                if (repeatMs > 0) normalized["repeat_ms"] = repeatMs;
                if (initialDelayMs > 0) normalized["repeat_initial_delay_ms"] = initialDelayMs;
                if (maxRepeats > 0) normalized["max_repeats"] = maxRepeats;
                normalized["until"] = until;
                cfg["policies"].push_back(std::move(normalized));
                continue;
            }

            json legacyPolicy = {
                {"id", policyId},
                {"name", p.value("name", policyId)},
                {"enabled", policyEnabled},
                {"min_severity", 0},
                {"on", triggers},
                {"targets", json::array()},
                {"repeat_ms", repeatMs},
                {"repeat_initial_delay_ms", initialDelayMs},
                {"max_repeats", maxRepeats},
                {"until", until},
                {"schedule_id", scheduleId.empty() ? "always" : scheduleId}
            };
            bool policyHasVoiceStep = false;

            if (!p.contains("steps") || !p["steps"].is_array()) continue;
            size_t stepIndex = 0;
            for (const auto& step : p["steps"])
            {
                stepIndex++;
                if (!step.is_object()) continue;
                const std::string routeId = step.value("route_id", "");
                if (routeId.empty()) continue;
                auto itRoute = routeById.find(routeId);
                if (itRoute == routeById.end()) continue;
                const json& route = itRoute->second;
                const std::string routeType = route.value("type", "");
                const bool routeEnabled = route.value("enabled", true);
                const bool effectiveEnabled = policyEnabled && routeEnabled;

                if (routeType == "audio_command")
                {
                    const json routeCfg = route.contains("config") && route["config"].is_object() ? route["config"] : json::object();
                    if (!routeCfg.contains("command") || !routeCfg["command"].is_string()) continue;
                    json legacyRoute = {
                        {"name", policyId + "__step_" + std::to_string(stepIndex)},
                        {"type", "audio_command"},
                        {"enabled", effectiveEnabled},
                        {"min_severity", 0},
                        {"on", triggers},
                        {"command", routeCfg.value("command", "")},
                        {"args", routeCfg.value("args", json::array({"{audio_path}"}))},
                        {"repeat_ms", repeatMs},
                        {"repeat_initial_delay_ms", initialDelayMs},
                        {"until", until},
                        {"schedule_id", scheduleId.empty() ? "always" : scheduleId}
                    };
                    cfg["routes"].push_back(std::move(legacyRoute));
                    continue;
                }

                if (routeType == "voice_modem")
                {
                    policyHasVoiceStep = true;
                    if (!effectiveEnabled) legacyPolicy["enabled"] = false;
                    if (step.contains("targets") && step["targets"].is_array())
                    {
                        const int64_t stepAfterMs = std::max<int64_t>(0, step.value("after_ms", 0LL));
                        for (const auto& targetId : step["targets"])
                        {
                            if (!targetId.is_string()) continue;
                            const std::string tid = targetId.get<std::string>();
                            auto itTarget = targetById.find(tid);
                            if (itTarget == targetById.end()) continue;
                            const std::string type = itTarget->second.value("type", "");
                            if (type == "phone")
                            {
                                legacyPolicy["targets"].push_back({{"type", "contact"}, {"id", tid}, {"after_ms", stepAfterMs}});
                            }
                            else if (type == "group")
                            {
                                legacyPolicy["targets"].push_back({{"type", "group"}, {"id", tid}, {"after_ms", stepAfterMs}});
                            }
                        }
                    }
                    continue;
                }

                std::cerr << "[alarms] route type not yet supported by runtime: " << routeType << "\n";
            }
            if (policyHasVoiceStep)
            {
                cfg["policies"].push_back(std::move(legacyPolicy));
            }
        }
    }

    bool hasAudioPolicy = false;
    if (cfg.contains("policies") && cfg["policies"].is_array())
    {
        for (const auto& p : cfg["policies"])
        {
            if (!p.is_object()) continue;
            std::string t = p.value("output_type", p.value("type", std::string("")));
            if (t == "voice") t = "phone";
            if (t == "audio") { hasAudioPolicy = true; break; }
        }
    }
    if (hasAudioPolicy && cfg.contains("routes") && cfg["routes"].is_array() && cfg["routes"].empty())
    {
        cfg["routes"].push_back({
            {"name", "default_audio"},
            {"type", "audio_command"},
            {"enabled", true},
            {"min_severity", 0},
            {"on", json::array({"active"})},
            {"command", "/usr/bin/aplay"},
            {"args", json::array({"{audio_path}"})},
            {"repeat_ms", 0},
            {"until", "acked_or_returned"}
        });
    }

    return cfg;
}

static json notification_config_from_root(const json& root)
{
    return notification_config_from_root_current(root);
}

static bool json_equalish(const json &a, const json &b)
{
    if (a.type() == b.type()) return a == b;
    if (a.is_number() && b.is_number()) return a.get<double>() == b.get<double>();
    if (a.is_boolean() && b.is_number()) return (a.get<bool>() ? 1.0 : 0.0) == b.get<double>();
    if (a.is_number() && b.is_boolean()) return a.get<double>() == (b.get<bool>() ? 1.0 : 0.0);
    if (a.is_string() && b.is_string()) return a.get<std::string>() == b.get<std::string>();
    return a.dump() == b.dump();
}

static std::optional<double> coerce_number(const json &v)
{
    try {
        if (v.is_number_float()) return v.get<double>();
        if (v.is_number_integer()) return static_cast<double>(v.get<int64_t>());
        if (v.is_number_unsigned()) return static_cast<double>(v.get<uint64_t>());
        if (v.is_boolean()) return v.get<bool>() ? 1.0 : 0.0;
        if (v.is_string()) {
            const std::string s = v.get<std::string>();
            size_t idx = 0;
            double d = std::stod(s, &idx);
            if (idx == 0) return std::nullopt;
            return d;
        }
    } catch (...) {
        return std::nullopt;
    }
    return std::nullopt;
}

static std::string json_text_value(const json &v)
{
    if (v.is_string()) return v.get<std::string>();
    if (v.is_null()) return "";
    return v.dump();
}

class NotificationManager
{
public:
	    struct Route
	    {
        std::string name;
        std::string type;
        bool enabled = true;
        int min_severity = 0;
        std::vector<std::string> on{"active"};
        std::string command;
        std::vector<std::string> args;
        int64_t repeat_ms = 0;
        int64_t repeat_initial_delay_ms = 0;
        // 0 = repeat indefinitely (until stop condition), >0 = total attempts (including first).
        int max_repeats = 0;
        std::string until = "acked_or_returned";
        std::string schedule_id = "always";
	    };

		    // Shared TTS settings (not SIP- or modem-specific).
		    struct TtsConfig
		    {
		        // Applies to espeak/espeak-ng. Lower is slower. Typical default is ~175 WPM.
		        int speed_wpm = 175;
		        // Voice selector. For espeak/espeak-ng this maps to `-v <voice>`.
		        // For flite this maps to `-voice <voice>` when provided.
		        std::string voice;
		    };

			    struct VoiceModemConfig
			    {
			        bool enabled = false;
			        std::string device;
			        int baud = 115200;
		        bool voice_init = false;
		        int voice_line = 1;
		        int dial_seconds = 30;
		        int audio_delay_seconds = 8;
			        int audio_gap_ms = 50;
			        int command_timeout_ms = 3000;
			        std::string tts_engine = "auto";
			    };

			    struct SipConfig
			    {
			        bool enabled = false;
			        std::string server;
			        std::string ext;
			        std::string pass;
			        std::string transport = "udp";
			        std::string net_if;
			        int duration_sec = 20;
			        // Optional: append a brief TTS prompt like "Press 1 to acknowledge." when ACK is enabled.
			        bool ack_prompt_tts = true;
		        // When true, attempt to place calls using the in-process PJSUA2 library.
		        // When false (default), use the external `pjsua` binary which is more isolated
		        // (a crash in pjsua won't take down opcbridge-alarms).
		        bool use_pjsua2 = false;
		        std::string test_to;
		        std::string test_audio_file;
		        std::string test_tts_text;
		        // Optional: play a short confirmation message after DTMF acknowledgement, then hang up.
			        std::string ack_confirm_audio_file;
		        std::string ack_confirm_tts_text;
			        int ack_confirm_max_ms = 4000;
			    };

	    SipConfig sip_config_copy() const
	    {
	        std::lock_guard<std::mutex> lock(mu_);
	        return sip_;
	    }

	    std::string audio_path_for_id_copy(const std::string& id) const
	    {
	        std::lock_guard<std::mutex> lock(mu_);
	        const auto it = audio_paths_.find(id);
	        return it == audio_paths_.end() ? "" : it->second;
	    }

	    bool generate_tts_wav_public(const std::string& rawText, std::string& path, std::string& err) const
	    {
	        std::lock_guard<std::mutex> lock(mu_);
	        return generate_tts_wav_locked(rawText, path, err);
	    }

    struct Contact
    {
        std::string id;
        std::string name;
        std::string phone;
        std::string phone_home;
        std::string phone_work;
        std::string phone_cell;
        std::string email;
        bool enabled = true;
        int audio_delay_seconds = -1;
    };

    struct SmtpConfig
    {
        bool enabled = false;
        std::string host;
        int port = 587;
        std::string security = "starttls";
        std::string username;
        std::string password;
        std::string from_address;
        std::string from_name;
        std::string test_to;
        int timeout_sec = 20;
    };

    struct TestCallRequest
    {
        std::string contact_id = "test";
        std::string contact_name = "Test Call";
        std::string phone;
        std::string audio_file;
        std::string tts_text;
    };

    struct ContactGroup
    {
        std::string id;
        std::string name;
        bool enabled = true;
        std::vector<std::string> contacts;
    };

    struct PolicyTarget
    {
        std::string type;
        std::string id;
        std::string method;
        int64_t after_ms = 0;
    };

			    struct Policy
			    {
	        std::string id;
	        std::string name;
	        std::string output_type = "phone";
	        // For call/phone policies, allow choosing which backend to use.
	        // "auto" (default) prefers SIP when configured, otherwise uses voice modem.
	        // "sip" forces SIP, "voice_modem" forces voice modem.
	        std::string call_backend = "auto";
	        bool enabled = true;
	        int min_severity = 0;
	        std::vector<std::string> on{"active"};
	        std::vector<PolicyTarget> targets;
	        std::vector<std::string> contacts;
	        std::vector<std::string> contact_groups;
        int64_t repeat_ms = 0;
        int64_t repeat_initial_delay_ms = 0;
        // 0 = repeat indefinitely (until stop condition), >0 = total attempts (including first).
        int max_repeats = 0;
        std::string until = "acked_or_returned";
        int audio_delay_seconds = -1;
        int audio_gap_ms = -1;
        std::string schedule_id = "always";
        bool ack_enabled = true;
        std::vector<std::string> ack_dtmf{"1"};
        int ack_wait_sec = 8;
        int ring_timeout_sec = 15;
        std::string email_subject_template;
        std::string email_active_body_template;
        std::string email_clear_body_template;
			    };
    struct Assignment
    {
        std::string id;
        bool enabled = true;
        std::string plan_id;
        int priority = 1000;
        std::string alarm_id;
        std::string group;
        std::string site;
        std::optional<int> severity_min;
        std::optional<int> severity_max;
    };
    struct AlarmRouteBinding
    {
        std::string id;
        std::string name;
        bool enabled = true;
        std::string schedule_id = "always";
        std::vector<std::string> alarms;
        std::vector<std::string> policy_ids;
    };

    struct Schedule
    {
        std::string id;
        std::string type = "always";
        std::string schedule_id;
        std::array<bool, 7> custom_days{{true, true, true, true, true, true, true}};
        bool custom_has_days = false;
        std::string start_date;
        std::string end_date;
        std::string start_time;
        std::string end_time;
    };

			    struct Job
			    {
	        Route route;
	        AlarmState alarm;
	        std::string event_type;
	        int64_t due_ms = 0;
	        std::string phone;
	        std::string email;
	        std::string email_subject;
	        std::string email_body;
	        std::string contact_id;
	        std::string contact_name;
	        std::string policy_id;
	        std::string call_backend = "auto";
	        int audio_delay_seconds = -1;
	        int audio_gap_ms = -1;
	        std::vector<std::string> ack_dtmf{"1"};
	        int ack_wait_sec = 8;
			        int ring_timeout_sec = 15;
			        // Remaining repeats after the first attempt. -1 = infinite.
			        int repeats_left = 0;
	        // Optional: for phone/call policies that should try multiple targets in order.
	        struct CallLeg
	        {
	            std::string contact_id;
	            std::string contact_name;
	            std::string phone;
	            int64_t after_ms = 0;
	            int audio_delay_seconds = -1;
	        };
	        std::vector<CallLeg> call_legs;
	    };

	    struct EscalationLogEntry
	    {
	        int64_t ts_ms = 0;
	        std::string alarm_id;
	        std::string event_type;
	        std::string policy_id;
	        std::string route_type;
	        std::string contact_id;
	        std::string contact_name;
	        std::string phone;
	        std::string action;
	        std::string detail;
	    };

    struct TtsPart
    {
        bool pause = false;
        std::string text;
        int pause_ms = 0;
    };

    enum class JobQueue
    {
        Audio,
        Modem
    };

    void set_db(AlarmDb* ptr)
    {
        std::lock_guard<std::mutex> lock(mu_);
        db_ = ptr;
    }

    void set_should_continue(std::function<bool(const std::string&, const std::string&)> fn)
    {
        std::lock_guard<std::mutex> lock(mu_);
        should_continue_ = std::move(fn);
    }

    void set_ack_alarm(std::function<bool(const std::string&, const std::string&, const std::string&)> fn)
    {
        std::lock_guard<std::mutex> lock(mu_);
        ack_alarm_ = std::move(fn);
    }

    void set_config_dir(std::string dir)
    {
        std::lock_guard<std::mutex> lock(mu_);
        config_dir_ = std::move(dir);
    }

    void configure(const json& cfg)
    {
        std::lock_guard<std::mutex> lock(mu_);
        routes_.clear();
        voice_modem_ = VoiceModemConfig{};
        contacts_.clear();
        contact_groups_.clear();
        policies_.clear();
        policy_name_to_id_.clear();
        assignments_.clear();
        alarm_route_bindings_.clear();
        schedules_.clear();
        audio_paths_.clear();
        audio_jobs_.clear();
        modem_jobs_.clear();
        if (!cfg.is_object())
        {
            audio_cv_.notify_all();
            modem_cv_.notify_all();
            return;
        }

        if (cfg.contains("schedules") && cfg["schedules"].is_array())
        {
            auto parse_hhmm = [](const std::string& text, int& outMin) -> bool {
                if (text.size() != 5 || text[2] != ':') return false;
                if (!std::isdigit(static_cast<unsigned char>(text[0])) || !std::isdigit(static_cast<unsigned char>(text[1])) ||
                    !std::isdigit(static_cast<unsigned char>(text[3])) || !std::isdigit(static_cast<unsigned char>(text[4]))) return false;
                const int hh = (text[0] - '0') * 10 + (text[1] - '0');
                const int mm = (text[3] - '0') * 10 + (text[4] - '0');
                if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return false;
                outMin = hh * 60 + mm;
                return true;
            };
            auto day_index = [](const std::string& d) -> int {
                if (d == "sun") return 0;
                if (d == "mon") return 1;
                if (d == "tue") return 2;
                if (d == "wed") return 3;
                if (d == "thu") return 4;
                if (d == "fri") return 5;
                if (d == "sat") return 6;
                return -1;
            };
            auto parse_ymd = [](const std::string& text, int& outYmd) -> bool {
                if (text.size() != 10 || text[4] != '-' || text[7] != '-') return false;
                for (size_t i = 0; i < text.size(); ++i)
                {
                    if (i == 4 || i == 7) continue;
                    if (!std::isdigit(static_cast<unsigned char>(text[i]))) return false;
                }
                const int yyyy = std::stoi(text.substr(0, 4));
                const int mm = std::stoi(text.substr(5, 2));
                const int dd = std::stoi(text.substr(8, 2));
                if (yyyy < 1970 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
                outYmd = (yyyy * 10000) + (mm * 100) + dd;
                return true;
            };
            for (const auto& item : cfg["schedules"])
            {
                if (!item.is_object()) continue;
                Schedule s;
                s.id = item.value("id", "");
                s.type = item.value("type", "always");
                s.schedule_id = item.value("schedule_id", "");
                if (s.id.empty()) continue;
                if (s.type == "custom")
                {
                    s.start_date = item.value("start_date", "");
                    s.end_date = item.value("end_date", "");
                    s.start_time = item.value("start_time", "");
                    s.end_time = item.value("end_time", "");
                    if (item.contains("days") && item["days"].is_array())
                    {
                        s.custom_days = {{false, false, false, false, false, false, false}};
                        s.custom_has_days = false;
                        for (const auto& dv : item["days"])
                        {
                            if (!dv.is_string()) continue;
                            const int idx = day_index(dv.get<std::string>());
                            if (idx < 0) continue;
                            s.custom_days[static_cast<size_t>(idx)] = true;
                            s.custom_has_days = true;
                        }
                    }
                    int y = 0;
                    if (!s.start_date.empty() && !parse_ymd(s.start_date, y)) s.start_date.clear();
                    if (!s.end_date.empty() && !parse_ymd(s.end_date, y)) s.end_date.clear();
                    int tmin = 0;
                    const bool hasStart = !s.start_time.empty();
                    const bool hasEnd = !s.end_time.empty();
                    if (hasStart && hasEnd)
                    {
                        if (!parse_hhmm(s.start_time, tmin) || !parse_hhmm(s.end_time, tmin))
                        {
                            s.start_time.clear();
                            s.end_time.clear();
                        }
                    }
                    else if (hasStart || hasEnd)
                    {
                        s.start_time.clear();
                        s.end_time.clear();
                    }
                }
                schedules_[s.id] = std::move(s);
            }
        }
        if (schedules_.find("always") == schedules_.end())
        {
            Schedule always;
            always.id = "always";
            always.type = "always";
            schedules_[always.id] = std::move(always);
        }

		        if (cfg.contains("voice_modem") && cfg["voice_modem"].is_object())
		        {
		            const auto& vm = cfg["voice_modem"];
		            voice_modem_.enabled = vm.value("enabled", false);
            voice_modem_.device = vm.value("device", "");
            voice_modem_.baud = vm.value("baud", 115200);
            voice_modem_.voice_init = vm.value("voice_init", false);
            voice_modem_.voice_line = vm.value("voice_line", 1);
            voice_modem_.dial_seconds = vm.value("dial_seconds", 30);
		            voice_modem_.audio_delay_seconds = vm.value("audio_delay_seconds", 8);
			            voice_modem_.audio_gap_ms = vm.value("audio_gap_ms", 50);
			            voice_modem_.command_timeout_ms = vm.value("command_timeout_ms", 3000);
			            voice_modem_.tts_engine = vm.value("tts_engine", "auto");
			        }

		        // Shared TTS settings.
		        // Back-compat: if tts.speed_wpm is missing, fall back to voice_modem.tts_speed_wpm when present.
		        tts_.speed_wpm = 175;
			        if (cfg.contains("tts") && cfg["tts"].is_object())
			        {
			            const auto& t = cfg["tts"];
			            tts_.speed_wpm = std::max(80, std::min(450, t.value("speed_wpm", 175)));
			            tts_.voice = t.value("voice", "");
			        }
		        else if (cfg.contains("voice_modem") && cfg["voice_modem"].is_object())
		        {
		            const auto& vm = cfg["voice_modem"];
		            tts_.speed_wpm = std::max(80, std::min(450, vm.value("tts_speed_wpm", 175)));
		        }

	        sip_ = SipConfig{};
        if (cfg.contains("sip") && cfg["sip"].is_object())
        {
            const auto& s = cfg["sip"];
	            sip_.enabled = s.value("enabled", false);
	            sip_.server = s.value("server", "");
	            sip_.ext = s.value("ext", "");
	            sip_.pass = s.value("pass", "");
		            sip_.transport = s.value("transport", "udp");
		            sip_.net_if = s.value("net_if", "");
		            sip_.duration_sec = std::max(5, std::min(300, s.value("duration_sec", 20)));
		            sip_.ack_prompt_tts = s.value("ack_prompt_tts", true);
		            sip_.use_pjsua2 = s.value("use_pjsua2", false);
		            sip_.test_to = s.value("test_to", "");
	            sip_.test_audio_file = s.value("test_audio_file", "");
	            sip_.test_tts_text = s.value("test_tts_text", "");
	            sip_.ack_confirm_audio_file = s.value("ack_confirm_audio_file", "");
	            sip_.ack_confirm_tts_text = s.value("ack_confirm_tts_text", "");
	            sip_.ack_confirm_max_ms = std::max(0, std::min(30000, s.value("ack_confirm_max_ms", 4000)));
	        }

        if (cfg.contains("audio") && cfg["audio"].is_object() && cfg["audio"].contains("files") && cfg["audio"]["files"].is_array())
        {
            for (const auto& f : cfg["audio"]["files"])
            {
                if (!f.is_object()) continue;
                const std::string id = json_string_or_empty(f, "id");
                if (id.empty()) continue;
                std::string path = json_string_or_empty(f, "path");
                if (path.empty()) path = id;
                audio_paths_[id] = resolve_audio_path(config_dir_, path);
            }
        }

        smtp_ = SmtpConfig{};
        if (cfg.contains("smtp") && cfg["smtp"].is_object())
        {
            const auto& s = cfg["smtp"];
            smtp_.enabled = s.value("enabled", false);
            smtp_.host = s.value("host", "");
            smtp_.port = std::max(1, std::min(65535, s.value("port", 587)));
            smtp_.security = s.value("security", "starttls");
            if (smtp_.security != "starttls" && smtp_.security != "tls" && smtp_.security != "none") smtp_.security = "starttls";
            smtp_.username = s.value("username", "");
            smtp_.password = s.value("password", "");
            smtp_.from_address = s.value("from_address", "");
            smtp_.from_name = s.value("from_name", "");
            smtp_.test_to = s.value("test_to", "");
            smtp_.timeout_sec = std::max(5, std::min(120, s.value("timeout_sec", 20)));
        }

        if (cfg.contains("contacts") && cfg["contacts"].is_array())
        {
            for (const auto& item : cfg["contacts"])
            {
                if (!item.is_object()) continue;
                Contact c;
                c.id = item.value("id", "");
                c.name = item.value("name", c.id);
                c.phone = item.value("phone", "");
                c.phone_home = item.value("phone_home", "");
                c.phone_work = item.value("phone_work", "");
                c.phone_cell = item.value("phone_cell", "");
                c.email = item.value("email", "");
                if (c.phone_cell.empty()) c.phone_cell = item.value("cell", "");
                if (c.phone_home.empty()) c.phone_home = item.value("home", "");
                if (c.phone_work.empty()) c.phone_work = item.value("work", "");
                if (c.phone.empty()) c.phone = !c.phone_cell.empty() ? c.phone_cell : (!c.phone_work.empty() ? c.phone_work : c.phone_home);
                c.enabled = item.value("enabled", true);
                if (item.contains("audio_delay_seconds") && item["audio_delay_seconds"].is_number_integer())
                {
                    c.audio_delay_seconds = std::max(0, std::min(120, item["audio_delay_seconds"].get<int>()));
                }
                if (!c.id.empty()) contacts_[c.id] = std::move(c);
            }
        }

        if (cfg.contains("contact_groups") && cfg["contact_groups"].is_array())
        {
            for (const auto& item : cfg["contact_groups"])
            {
                if (!item.is_object()) continue;
                ContactGroup g;
                g.id = item.value("id", "");
                g.name = item.value("name", g.id);
                g.enabled = item.value("enabled", true);
                if (item.contains("contacts") && item["contacts"].is_array())
                {
                    for (const auto& cid : item["contacts"])
                    {
                        if (cid.is_string()) g.contacts.push_back(cid.get<std::string>());
                    }
                }
                if (!g.id.empty()) contact_groups_[g.id] = std::move(g);
            }
        }

        if (cfg.contains("policies") && cfg["policies"].is_array())
        {
            for (const auto& item : cfg["policies"])
            {
                if (!item.is_object()) continue;
                Policy p;
                p.id = item.value("id", "");
                p.name = item.value("name", p.id);
                p.output_type = item.value("output_type", item.value("type", std::string("phone")));
                if (p.output_type == "voice") p.output_type = "phone";
                p.call_backend = item.value("call_backend", "auto");
                if (p.call_backend != "auto" && p.call_backend != "sip" && p.call_backend != "voice_modem") p.call_backend = "auto";
                p.enabled = item.value("enabled", true);
                p.min_severity = item.value("min_severity", 0);
                p.repeat_ms = item.value("repeat_ms", 0LL);
                p.repeat_initial_delay_ms = item.value("repeat_initial_delay_ms", 0LL);
                p.max_repeats = item.value("max_repeats", 0);
                p.until = item.value("until", p.until);
                // If repeat is specified using the schema2-style object, honor it even
                // when legacy fields are absent (or left null by some tooling).
                if (item.contains("repeat") && item["repeat"].is_object())
                {
                    const auto& rep = item["repeat"];
                    const bool repEnabled = rep.value("enabled", false);
                    if (repEnabled)
                    {
                        p.repeat_ms = std::max<int64_t>(1, rep.value("interval_ms", 60000LL));
                    }
                    else
                    {
                        p.repeat_ms = 0;
                    }
                    p.repeat_initial_delay_ms = std::max<int64_t>(0, rep.value("initial_delay_ms", 0LL));
                    p.max_repeats = std::max(0, std::min(1000000, static_cast<int>(rep.value("max_repeats", 0LL))));
                    p.until = rep.value("stop_on", p.until);
                }
                p.schedule_id = item.value("schedule_id", "always");
                if (item.contains("audio_delay_seconds") && item["audio_delay_seconds"].is_number_integer())
                {
                    p.audio_delay_seconds = std::max(0, std::min(120, item["audio_delay_seconds"].get<int>()));
                }
                if (item.contains("audio_gap_ms") && item["audio_gap_ms"].is_number_integer())
                {
                    p.audio_gap_ms = std::max(0, std::min(5000, item["audio_gap_ms"].get<int>()));
                }
                if (item.contains("on") && item["on"].is_array())
                {
                    p.on.clear();
                    for (const auto& ev : item["on"])
                    {
                        if (ev.is_string()) p.on.push_back(ev.get<std::string>());
                    }
                }
                else if (item.contains("triggers") && item["triggers"].is_array())
                {
                    // Schema2 UI uses "triggers" instead of "on".
                    p.on.clear();
                    for (const auto& ev : item["triggers"])
                    {
                        if (ev.is_string()) p.on.push_back(ev.get<std::string>());
                    }
                }
                if (item.contains("contacts") && item["contacts"].is_array())
                {
                    for (const auto& cid : item["contacts"])
                    {
                        if (cid.is_string()) p.contacts.push_back(cid.get<std::string>());
                    }
                }
                if (item.contains("contact_groups") && item["contact_groups"].is_array())
                {
                    for (const auto& gid : item["contact_groups"])
                    {
                        if (gid.is_string()) p.contact_groups.push_back(gid.get<std::string>());
                    }
                }
                if (item.contains("targets") && item["targets"].is_array())
                {
                    for (const auto& target : item["targets"])
                    {
                        if (!target.is_object()) continue;
                        PolicyTarget t;
                        t.type = target.value("type", "");
                        t.id = target.value("id", "");
                        t.method = target.value("method", "");
                        t.after_ms = std::max<int64_t>(0, target.value("after_ms", 0LL));
                        if ((t.type == "contact" || t.type == "group") && !t.id.empty()) p.targets.push_back(std::move(t));
                    }
                }
                if (item.contains("ack_enabled") && item["ack_enabled"].is_boolean())
                {
                    p.ack_enabled = item["ack_enabled"].get<bool>();
                }
                if (item.contains("ack_dtmf") && item["ack_dtmf"].is_array())
                {
                    p.ack_dtmf.clear();
                    for (const auto& dv : item["ack_dtmf"])
                    {
                        std::string key;
                        if (dv.is_string()) key = dv.get<std::string>();
                        else if (dv.is_number_integer()) key = std::to_string(dv.get<int>());
                        else if (dv.is_number_unsigned()) key = std::to_string(dv.get<unsigned int>());
                        else continue;
                        if (key.empty()) continue;
                        // Normalize to a single DTMF char.
                        p.ack_dtmf.push_back(std::string(1, key[0]));
                    }
                    if (p.ack_dtmf.empty()) p.ack_dtmf.push_back("1");
                }
                else if (item.contains("ack_dtmf") && item["ack_dtmf"].is_string())
                {
                    // Some older configs/tooling may serialize as a single string ("9") instead of ["9"].
                    const std::string raw = item["ack_dtmf"].get<std::string>();
                    p.ack_dtmf.clear();
                    std::string token;
                    auto push_token = [&]() {
                        // Trim whitespace.
                        size_t b = 0;
                        while (b < token.size() && std::isspace(static_cast<unsigned char>(token[b]))) ++b;
                        size_t e = token.size();
                        while (e > b && std::isspace(static_cast<unsigned char>(token[e - 1]))) --e;
                        if (e > b) p.ack_dtmf.push_back(std::string(1, token[b]));
                        token.clear();
                    };
                    for (const char ch : raw)
                    {
                        if (ch == ',' || std::isspace(static_cast<unsigned char>(ch)))
                        {
                            push_token();
                            continue;
                        }
                        token.push_back(ch);
                    }
                    push_token();
                    if (p.ack_dtmf.empty()) p.ack_dtmf.push_back("1");
                }
                else if (item.contains("ack_dtmf") && item["ack_dtmf"].is_number_integer())
                {
                    // Accept a single numeric key (e.g. 9).
                    const int v = item["ack_dtmf"].get<int>();
                    const std::string s = std::to_string(v);
                    p.ack_dtmf.clear();
                    if (!s.empty()) p.ack_dtmf.push_back(std::string(1, s[0]));
                    if (p.ack_dtmf.empty()) p.ack_dtmf.push_back("1");
                }
                if (item.contains("ack_wait_sec") && item["ack_wait_sec"].is_number_integer())
                {
                    p.ack_wait_sec = std::max(0, std::min(120, item["ack_wait_sec"].get<int>()));
                }
                if (!p.ack_enabled)
                {
                    p.ack_dtmf.clear();
                    p.ack_wait_sec = 0;
                }
                if (item.contains("ring_timeout_sec") && item["ring_timeout_sec"].is_number_integer())
                {
                    p.ring_timeout_sec = std::max(5, std::min(600, item["ring_timeout_sec"].get<int>()));
                }
                p.email_subject_template = item.value("email_subject_template", std::string(""));
                p.email_active_body_template = item.value("email_active_body_template", std::string(""));
                p.email_clear_body_template = item.value("email_clear_body_template", std::string(""));
                // max_rings removed; use ring_timeout_sec only.
                if (p.targets.empty())
                {
                    for (const auto& cid : p.contacts) p.targets.push_back({"contact", cid, "cell", 0});
                    for (const auto& gid : p.contact_groups) p.targets.push_back({"group", gid, "cell", 0});
                }
                if (!p.id.empty())
                {
                    const std::string id = p.id;
                    const std::string name = p.name;
                    policies_[id] = std::move(p);
                    if (!name.empty() && name != id)
                    {
                        policy_name_to_id_[name] = id;
                    }
                }
            }
        }
        if (cfg.contains("assignments") && cfg["assignments"].is_array())
        {
            for (const auto& item : cfg["assignments"])
            {
                if (!item.is_object()) continue;
                Assignment a;
                a.id = item.value("id", "");
                a.enabled = item.value("enabled", true);
                a.plan_id = item.value("plan_id", "");
                a.priority = item.value("priority", 1000);
                const json scope = item.contains("scope") && item["scope"].is_object() ? item["scope"] : item;
                if (scope.contains("alarm_id") && scope["alarm_id"].is_string()) a.alarm_id = scope["alarm_id"].get<std::string>();
                if (scope.contains("group") && scope["group"].is_string()) a.group = scope["group"].get<std::string>();
                if (scope.contains("site") && scope["site"].is_string()) a.site = scope["site"].get<std::string>();
                if (scope.contains("severity_min") && scope["severity_min"].is_number_integer()) a.severity_min = scope["severity_min"].get<int>();
                if (scope.contains("severity_max") && scope["severity_max"].is_number_integer()) a.severity_max = scope["severity_max"].get<int>();
                if (!a.plan_id.empty())
                {
                    auto aliasIt = policy_name_to_id_.find(a.plan_id);
                    if (aliasIt != policy_name_to_id_.end()) a.plan_id = aliasIt->second;
                    assignments_.push_back(std::move(a));
                }
            }
        }
        if (cfg.contains("alarm_groups") && cfg["alarm_groups"].is_array())
        {
            for (const auto& item : cfg["alarm_groups"])
            {
                if (!item.is_object()) continue;
                AlarmRouteBinding route;
                route.id = item.value("id", "");
                route.name = item.value("name", route.id);
                route.enabled = item.value("enabled", true);
                route.schedule_id = item.value("schedule_id", "always");
                if (item.contains("alarms") && item["alarms"].is_array())
                {
                    for (const auto& aid : item["alarms"])
                    {
                        if (!aid.is_string()) continue;
                        const std::string id = aid.get<std::string>();
                        if (!id.empty()) route.alarms.push_back(id);
                    }
                }
                if (item.contains("policy_ids") && item["policy_ids"].is_array())
                {
                    for (const auto& pid : item["policy_ids"])
                    {
                        if (!pid.is_string()) continue;
                        const std::string id = pid.get<std::string>();
                        if (!id.empty()) route.policy_ids.push_back(id);
                    }
                }
                if (!route.id.empty()) alarm_route_bindings_.push_back(std::move(route));
            }
        }

        if (!cfg.contains("routes") || !cfg["routes"].is_array())
        {
            audio_cv_.notify_all();
            modem_cv_.notify_all();
            return;
        }

        for (const auto& item : cfg["routes"])
        {
            if (!item.is_object()) continue;
            Route r;
            r.name = item.value("name", "");
            r.type = item.value("type", "");
            r.enabled = item.value("enabled", true);
            r.min_severity = item.value("min_severity", 0);
            r.command = item.value("command", "");
            r.repeat_ms = item.value("repeat_ms", 0LL);
            r.repeat_initial_delay_ms = item.value("repeat_initial_delay_ms", 0LL);
            r.max_repeats = item.value("max_repeats", 0);
            r.until = item.value("until", r.until);
            r.schedule_id = item.value("schedule_id", "always");

            if (item.contains("on") && item["on"].is_array())
            {
                r.on.clear();
                for (const auto& ev : item["on"])
                {
                    if (ev.is_string()) r.on.push_back(ev.get<std::string>());
                }
            }

            if (item.contains("args") && item["args"].is_array())
            {
                for (const auto& arg : item["args"])
                {
                    if (arg.is_string()) r.args.push_back(arg.get<std::string>());
                }
            }

            if (r.name.empty()) r.name = r.type.empty() ? "notification" : r.type;
            if (r.type == "audio_command" && !r.command.empty()) routes_.push_back(std::move(r));
        }

        audio_cv_.notify_all();
        modem_cv_.notify_all();
    }

    void start()
    {
        std::lock_guard<std::mutex> lock(mu_);
        if (running_) return;
        stop_ = false;
        running_ = true;
        audio_worker_ = std::thread([this]() { worker_loop(JobQueue::Audio); });
        modem_worker_ = std::thread([this]() { worker_loop(JobQueue::Modem); });
    }

    void stop()
    {
        {
            std::lock_guard<std::mutex> lock(mu_);
            stop_ = true;
            audio_cv_.notify_all();
            modem_cv_.notify_all();
        }
        if (audio_worker_.joinable()) audio_worker_.join();
        if (modem_worker_.joinable()) modem_worker_.join();
        {
            std::lock_guard<std::mutex> lock(mu_);
            running_ = false;
        }
    }

    void notify_event(const AlarmState& alarm, const std::string& event_type)
    {
        std::lock_guard<std::mutex> lock(mu_);
        AlarmState alarmWithAudio = alarm;
        add_tts_audio_paths_locked(alarmWithAudio);
        enqueue_policy_jobs_locked(alarmWithAudio, event_type);
        if (!alarm_route_bindings_.empty())
        {
            audio_cv_.notify_all();
            modem_cv_.notify_all();
            return;
        }
        for (const auto& route : routes_)
        {
            if (!route.enabled) continue;
            if (alarmWithAudio.severity < route.min_severity) continue;
            bool eventMatch = false;
            for (const auto& ev : route.on)
            {
                if (ev == event_type) { eventMatch = true; break; }
            }
            if (!eventMatch) continue;
            if (!schedule_is_active_locked(route.schedule_id))
            {
                record_schedule_skip_locked("route", route.name, route.schedule_id, event_type, alarmWithAudio.alarm_id);
                continue;
            }
            if (route.type == "audio_command")
            {
                if (route_needs_audio_path(route) && alarmWithAudio.audio_path.empty()) continue;
            }

            Job job;
            job.route = route;
            job.alarm = alarmWithAudio;
            job.event_type = event_type;
            const int64_t tNow = now_ms();
            job.due_ms = tNow + ((job.event_type == "active") ? std::max<int64_t>(0, job.route.repeat_initial_delay_ms) : 0LL);
            if (job.route.max_repeats <= 0) job.repeats_left = -1;
            else job.repeats_left = std::max(0, job.route.max_repeats - 1);
            // Repeat behavior is controlled by policies/routes only (not per-alarm properties).
            apply_audio_default_arg(job);
            audio_jobs_.push_back(std::move(job));
        }
        audio_cv_.notify_all();
        modem_cv_.notify_all();
    }

    json status_json() const
    {
        std::lock_guard<std::mutex> lock(mu_);
        json routes = json::array();
        for (const auto& r : routes_)
        {
            routes.push_back({
                {"name", r.name},
                {"type", r.type},
                {"enabled", r.enabled},
                {"min_severity", r.min_severity},
                {"repeat_ms", r.repeat_ms},
                {"until", r.until}
            });
        }

        json modemQueueSample = json::array();
        {
            int count = 0;
            for (const auto& j : modem_jobs_)
            {
                if (count++ >= 5) break;
                std::string contactId = j.contact_id;
                std::string phone = j.phone;
                if (j.route.type == "call_sequence" && !j.call_legs.empty())
                {
                    contactId = j.call_legs.front().contact_id;
                    phone = j.call_legs.front().phone;
                }
                modemQueueSample.push_back({
                    {"due_ms", j.due_ms},
                    {"due_in_ms", std::max<int64_t>(0, j.due_ms - now_ms())},
                    {"alarm_id", j.alarm.alarm_id},
                    {"event_type", j.event_type},
                    {"policy_id", j.policy_id},
                    {"contact_id", contactId},
                    {"phone", phone},
                    {"route_type", j.route.type}
                });
            }
        }

        json audioQueueSample = json::array();
        {
            int count = 0;
            for (const auto& j : audio_jobs_)
            {
                if (count++ >= 5) break;
                audioQueueSample.push_back({
                    {"due_ms", j.due_ms},
                    {"due_in_ms", std::max<int64_t>(0, j.due_ms - now_ms())},
                    {"alarm_id", j.alarm.alarm_id},
                    {"event_type", j.event_type},
                    {"policy_id", j.policy_id},
                    {"route_type", j.route.type},
                    {"route_name", j.route.name}
                });
            }
        }
        return {
            {"running", running_},
            {"queued", static_cast<int>(audio_jobs_.size() + modem_jobs_.size())},
            {"queued_audio", static_cast<int>(audio_jobs_.size())},
            {"queued_voice_modem", static_cast<int>(modem_jobs_.size())},
            {"attempts", attempts_},
            {"successes", successes_},
            {"failures", failures_},
            {"last_attempt_ms", last_attempt_ms_},
            {"last_route_type", last_route_type_},
            {"last_route_name", last_route_name_},
            {"last_result", last_result_},
            {"active_call", active_modem_job_},
            {"active_audio", active_audio_job_},
            {"queue_sample", {
                {"audio", audioQueueSample},
                {"call", modemQueueSample}
            }},
            {"assignment_count", static_cast<int>(assignments_.size())},
            {"schedule_skips", schedule_skips_},
            {"last_schedule_skip", {
                {"ts_ms", last_schedule_skip_ts_ms_},
                {"scope", last_schedule_skip_scope_},
                {"name", last_schedule_skip_name_},
                {"schedule_id", last_schedule_skip_schedule_id_},
                {"event_type", last_schedule_skip_event_type_},
                {"alarm_id", last_schedule_skip_alarm_id_}
            }},
            {"last_policy_skip", {
                {"ts_ms", last_policy_skip_ts_ms_},
                {"scope_name", last_policy_skip_scope_name_},
                {"policy_id", last_policy_skip_policy_id_},
                {"event_type", last_policy_skip_event_type_},
                {"alarm_id", last_policy_skip_alarm_id_},
                {"reason", last_policy_skip_reason_}
            }},
            {"voice_modem", {
                {"enabled", voice_modem_.enabled},
                {"configured", !voice_modem_.device.empty()},
                {"device", voice_modem_.device},
                {"baud", voice_modem_.baud},
                {"voice_line", voice_modem_.voice_line},
                {"audio_delay_seconds", voice_modem_.audio_delay_seconds},
                {"audio_gap_ms", voice_modem_.audio_gap_ms},
                {"contacts", static_cast<int>(contacts_.size())}
            }},
            {"contacts", static_cast<int>(contacts_.size())},
            {"contact_groups", static_cast<int>(contact_groups_.size())},
            {"policies", static_cast<int>(policies_.size())},
            {"last_phone_ack", {
                {"ts_ms", last_phone_ack_ts_ms_},
                {"alarm_id", last_phone_ack_alarm_id_},
                {"policy_id", last_phone_ack_policy_id_},
                {"contact_id", last_phone_ack_contact_id_},
                {"dtmf", last_phone_ack_dtmf_}
            }},
            {"last_sip_debug", {
                {"ts_ms", last_sip_debug_ts_ms_},
                {"dtmf_markers", last_sip_debug_dtmf_markers_},
                {"tail", last_sip_debug_tail_}
            }},
            {"routes", routes}
        };
    }

	    json escalation_log_json(int limit = 200) const
	    {
	        std::lock_guard<std::mutex> lock(mu_);
	        limit = std::max(1, std::min(2000, limit));
	        json out = json::array();
	        const int n = static_cast<int>(escalation_log_.size());
	        const int start = std::max(0, n - limit);
	        for (int i = start; i < n; ++i)
	        {
	            const auto& e = escalation_log_[static_cast<size_t>(i)];
	            out.push_back({
	                {"ts_ms", e.ts_ms},
	                {"alarm_id", e.alarm_id},
	                {"event_type", e.event_type},
	                {"policy_id", e.policy_id},
	                {"route_type", e.route_type},
	                {"contact_id", e.contact_id},
	                {"contact_name", e.contact_name},
	                {"phone", e.phone},
	                {"action", e.action},
	                {"detail", e.detail}
	            });
	        }
	        return out;
	    }

    bool test_voice_modem_call(const TestCallRequest& request, std::string& result)
    {
        Job job;
        job.route.name = "voice_modem:test";
        job.route.type = "voice_modem";
        job.event_type = "test";
        job.due_ms = now_ms();
        job.phone = request.phone;
        job.contact_id = request.contact_id.empty() ? "test" : request.contact_id;
        job.contact_name = request.contact_name.empty() ? job.contact_id : request.contact_name;
        job.policy_id = "test";
        job.alarm.alarm_id = "voice_modem_test";
        job.alarm.name = "Voice Modem Test";
        job.alarm.message = "Voice modem test call";
        job.alarm.severity = 0;

        if (!request.audio_file.empty())
        {
            std::lock_guard<std::mutex> lock(mu_);
            job.alarm.audio_file = request.audio_file;
            const auto it = audio_paths_.find(request.audio_file);
            job.alarm.audio_path = (it == audio_paths_.end())
                ? resolve_audio_path(config_dir_, request.audio_file)
                : it->second;
        }
        else if (!request.tts_text.empty())
        {
            std::lock_guard<std::mutex> lock(mu_);
            std::string err;
            if (!append_tts_audio_paths_locked(job.alarm, request.tts_text, err))
            {
                result = err;
                return false;
            }
        }

        return run_voice_modem_call(job, result);
    }

	    bool test_audio_playback(const std::string& audio_file, const std::string& tts_text, const std::string& output_device, std::string& result)
	    {
	        Route route;
	        AlarmState alarm;
	        std::string ttsVoice;
	        {
	            std::lock_guard<std::mutex> lock(mu_);
	            ttsVoice = tts_.voice;
	            const Route* baseRoute = select_audio_route_for_policy_locked();
	            if (baseRoute)
	            {
	                route = *baseRoute;
	            }
	            else
	            {
	                auto trim_ws = [](const std::string& in) -> std::string {
	                    size_t a = 0;
	                    while (a < in.size() && std::isspace(static_cast<unsigned char>(in[a]))) ++a;
	                    size_t b = in.size();
	                    while (b > a && std::isspace(static_cast<unsigned char>(in[b - 1]))) --b;
	                    return in.substr(a, b - a);
	                };
	                const std::string outputRaw = trim_ws(output_device);
	                const std::string output = outputRaw.empty() ? "default" : outputRaw;
	                route.type = "audio_command";
	                route.command = "/usr/bin/aplay";
	                if (output == "default")
	                {
	                    route.args = {"{audio_path}"};
	                }
	                else
	                {
	                    route.args = {"-D", output, "{audio_path}"};
	                }
	            }
	            route.name = "audio:test";
	            route.repeat_ms = 0;
	            route.repeat_initial_delay_ms = 0;

	            std::string fileId = audio_file;
	            const std::string cleanTts = trim_tts_text(tts_text);
	            if (fileId.empty() && cleanTts.empty() && !audio_paths_.empty()) fileId = audio_paths_.begin()->first;
	            if (!fileId.empty())
	            {
	                const auto it = audio_paths_.find(fileId);
	                if (it == audio_paths_.end() || it->second.empty())
	                {
	                    result = "audio_file not found: " + fileId;
	                    return false;
	                }
	                alarm.audio_file = fileId;
	                alarm.audio_path = it->second;
	                alarm.audio_files = {fileId};
	                alarm.audio_paths = {it->second};
	            }
	            alarm.alarm_id = "audio_test";
	            alarm.name = "Audio Test";
	            if (!cleanTts.empty())
	            {
	                std::string err;
	                if (!append_tts_audio_paths_locked(alarm, cleanTts, err))
	                {
	                    result = err;
	                    return false;
	                }
	            }
	            if (alarm.audio_paths.empty())
	            {
	                result = "no audio selected: choose a file or enter speech text";
	                return false;
	            }
	        }

	        Job job;
		        job.route = std::move(route);
		        job.alarm = std::move(alarm);
		        apply_audio_default_arg(job);
		        const std::string cmdPreview = command_string(job);
	        const int rc = run_audio_command_sequence(job);
	        result = "exit_code=" + std::to_string(rc)
	            + " files=" + std::to_string(job.alarm.audio_paths.size())
	            + " first_file=" + job.alarm.audio_file
	            + " first_path=" + job.alarm.audio_path
	            + " tts_voice=" + (ttsVoice.empty() ? std::string("(default)") : ttsVoice)
	            + " cmd=" + cmdPreview;
	        return rc == 0;
	    }

    std::string resolve_policy_for_alarm(const AlarmState& alarm) const
    {
        std::lock_guard<std::mutex> lock(mu_);
        return resolve_policy_for_alarm_locked(alarm);
    }

    bool test_email(const std::string& to, std::string& result)
    {
        AlarmState alarm;
        alarm.alarm_id = "email_test";
        alarm.name = "Email Test";
        alarm.message = "This is a test email from OPC Bridge.";
        alarm.severity = 0;
        return send_email_via_smtp(to, "OPC Bridge test email", email_body_for_alarm(alarm, "test"), result);
    }

private:
    static bool vector_contains(const std::vector<std::string>& values, const std::string& needle)
    {
        for (const auto& v : values)
        {
            if (v == needle) return true;
        }
        return false;
    }

    static std::string sanitize_phone_number(const std::string& raw)
    {
        std::string out;
        out.reserve(raw.size());
        for (char ch : raw)
        {
            const unsigned char c = static_cast<unsigned char>(ch);
            if (c >= '0' && c <= '9') out.push_back(static_cast<char>(c));
            else if (ch == '*' || ch == '#' || ch == ',' || ch == '+') out.push_back(ch);
            else if (ch == 'p' || ch == 'P') out.push_back('P');
            else if (ch == 'w' || ch == 'W') out.push_back('W');
            else if (ch == 't' || ch == 'T') out.push_back('T');
        }
        return out;
    }

    static std::string trim_tts_text(const std::string& raw)
    {
        std::string out;
        out.reserve(raw.size());
        bool lastSpace = false;
        for (char ch : raw)
        {
            const unsigned char c = static_cast<unsigned char>(ch);
            if (c == '\r' || c == '\n' || c == '\t' || c == ' ')
            {
                if (!lastSpace && !out.empty()) out.push_back(' ');
                lastSpace = true;
                continue;
            }
            if (c < 32) continue;
            out.push_back(ch);
            lastSpace = false;
            if (out.size() >= 500) break;
        }
        while (!out.empty() && out.back() == ' ') out.pop_back();
        return out;
    }

	    void push_escalation_log_locked(EscalationLogEntry e)
	    {
	        e.ts_ms = now_ms();
	        escalation_log_.push_back(std::move(e));
	        while (escalation_log_.size() > 2000) escalation_log_.pop_front();
	    }

	    void log_escalation(const std::string& action,
	                        const Job& job,
	                        const std::string& detail = "",
	                        const std::string& contact_id = "",
	                        const std::string& contact_name = "",
	                        const std::string& phone = "")
	    {
	        std::lock_guard<std::mutex> lock(mu_);
	        log_escalation_locked(action, job, detail, contact_id, contact_name, phone);
	    }

	    void log_escalation_locked(const std::string& action,
	                               const Job& job,
	                               const std::string& detail = "",
	                               const std::string& contact_id = "",
	                               const std::string& contact_name = "",
	                               const std::string& phone = "")
	    {
	        EscalationLogEntry e;
	        e.alarm_id = job.alarm.alarm_id;
	        e.event_type = job.event_type;
	        e.policy_id = job.policy_id;
	        e.route_type = job.route.type;
	        e.contact_id = contact_id.empty() ? job.contact_id : contact_id;
	        e.contact_name = contact_name.empty() ? job.contact_name : contact_name;
	        e.phone = phone.empty() ? job.phone : phone;
	        e.action = action;
	        e.detail = detail;
	        push_escalation_log_locked(e);
	        std::cout << "[alarms][escalation] ts_ms=" << e.ts_ms
	                  << " alarm_id=" << e.alarm_id
	                  << " policy_id=" << e.policy_id
	                  << " action=" << e.action
	                  << (e.contact_id.empty() ? "" : (" contact_id=" + e.contact_id))
	                  << (e.phone.empty() ? "" : (" phone=" + e.phone))
	                  << (e.detail.empty() ? "" : (" detail=" + e.detail))
	                  << "\n";
	    }

    static std::vector<TtsPart> parse_tts_parts(const std::string& raw)
    {
        std::vector<TtsPart> parts;
        std::string text;
        const std::string input = raw;
        size_t pos = 0;
        auto flush_text = [&]() {
            const std::string clean = trim_tts_text(text);
            if (!clean.empty()) parts.push_back(TtsPart{false, clean, 0});
            text.clear();
        };

        while (pos < input.size())
        {
            if (input[pos] != '[')
            {
                text.push_back(input[pos++]);
                continue;
            }

            const size_t close = input.find(']', pos + 1);
            if (close == std::string::npos)
            {
                text.push_back(input[pos++]);
                continue;
            }

            std::string token = input.substr(pos + 1, close - pos - 1);
            std::string lowered;
            lowered.reserve(token.size());
            for (char ch : token) lowered.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(ch))));

            const std::string prefix = "pause:";
            if (lowered.rfind(prefix, 0) != 0)
            {
                text.append(input.substr(pos, close - pos + 1));
                pos = close + 1;
                continue;
            }

            std::string value = lowered.substr(prefix.size());
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t") == std::string::npos ? 0 : value.find_last_not_of(" \t") + 1);
            char* end = nullptr;
            const long parsed = std::strtol(value.c_str(), &end, 10);
            if (end == value.c_str())
            {
                text.append(input.substr(pos, close - pos + 1));
                pos = close + 1;
                continue;
            }

            flush_text();
            const int ms = std::max(0, std::min(60000, static_cast<int>(parsed)));
            if (ms > 0) parts.push_back(TtsPart{true, "", ms});
            pos = close + 1;
        }

        flush_text();
        return parts;
    }

    static void append_le16(std::string& out, uint16_t value)
    {
        out.push_back(static_cast<char>(value & 0xff));
        out.push_back(static_cast<char>((value >> 8) & 0xff));
    }

    static void append_le32(std::string& out, uint32_t value)
    {
        out.push_back(static_cast<char>(value & 0xff));
        out.push_back(static_cast<char>((value >> 8) & 0xff));
        out.push_back(static_cast<char>((value >> 16) & 0xff));
        out.push_back(static_cast<char>((value >> 24) & 0xff));
    }

    bool generate_silence_wav_locked(int pause_ms, std::string& path, std::string& err) const
    {
        const int ms = std::max(1, std::min(60000, pause_ms));
        const std::filesystem::path dir = std::filesystem::path(config_dir_) / "tts-cache";
        std::error_code ec;
        std::filesystem::create_directories(dir, ec);
        if (ec)
        {
            err = "Failed to create TTS cache directory: " + ec.message();
            return false;
        }

        const uint32_t sampleRate = 8000;
        const uint16_t channels = 1;
        const uint16_t bitsPerSample = 16;
        const uint32_t frames = std::max<uint32_t>(1, static_cast<uint32_t>((static_cast<uint64_t>(ms) * sampleRate) / 1000));
        const uint32_t dataBytes = frames * channels * (bitsPerSample / 8);
        const std::filesystem::path wav = dir / ("pause_" + std::to_string(ms) + "_" + random_hex(8) + ".wav");

        std::string data;
        data.reserve(44 + dataBytes);
        data.append("RIFF", 4);
        append_le32(data, 36 + dataBytes);
        data.append("WAVE", 4);
        data.append("fmt ", 4);
        append_le32(data, 16);
        append_le16(data, 1);
        append_le16(data, channels);
        append_le32(data, sampleRate);
        append_le32(data, sampleRate * channels * (bitsPerSample / 8));
        append_le16(data, channels * (bitsPerSample / 8));
        append_le16(data, bitsPerSample);
        data.append("data", 4);
        append_le32(data, dataBytes);
        data.append(dataBytes, '\0');

        std::ofstream out(wav, std::ios::binary);
        if (!out)
        {
            err = "Failed to create pause WAV file.";
            return false;
        }
        out.write(data.data(), static_cast<std::streamsize>(data.size()));
        out.close();
        if (!out)
        {
            err = "Failed to write pause WAV file.";
            return false;
        }

        path = wav.string();
        return true;
    }

	    bool generate_tts_wav_locked(const std::string& rawText, std::string& path, std::string& err) const
	    {
	        const std::string text = trim_tts_text(rawText);
        if (text.empty())
        {
            err = "TTS text is empty.";
            return false;
        }

        std::string engine = voice_modem_.tts_engine;
        if (engine.empty() || engine == "auto")
        {
            if (command_exists("espeak-ng")) engine = "espeak-ng";
            else if (command_exists("espeak")) engine = "espeak";
            else if (command_exists("flite")) engine = "flite";
            else
            {
                err = "No TTS engine found. Install espeak-ng, espeak, or flite.";
                return false;
            }
        }
        else if (!command_exists(engine))
        {
            err = "Configured TTS engine is not executable: " + engine;
            return false;
        }

        const std::filesystem::path dir = std::filesystem::path(config_dir_) / "tts-cache";
        std::error_code ec;
        std::filesystem::create_directories(dir, ec);
        if (ec)
        {
            err = "Failed to create TTS cache directory: " + ec.message();
            return false;
        }

	        const std::filesystem::path wav = dir / ("tts_" + random_hex(8) + ".wav");
	        auto trim_ws = [](const std::string& in) -> std::string {
	            size_t i = 0;
	            while (i < in.size() && std::isspace(static_cast<unsigned char>(in[i]))) ++i;
	            size_t j = in.size();
	            while (j > i && std::isspace(static_cast<unsigned char>(in[j - 1]))) --j;
	            return in.substr(i, j - i);
	        };
	        std::string cmd;
	        // Support cascaded voices: `tts.voice` may be a comma-separated list.
	        std::vector<std::string> voiceCandidates;
	        {
	            const std::string voiceRaw = trim_ws(tts_.voice);
	            if (!voiceRaw.empty())
	            {
	                size_t start = 0;
	                while (start < voiceRaw.size())
	                {
	                    const size_t comma = voiceRaw.find(',', start);
	                    const std::string part = trim_ws(voiceRaw.substr(start, (comma == std::string::npos) ? std::string::npos : (comma - start)));
	                    if (!part.empty()) voiceCandidates.push_back(part);
	                    if (comma == std::string::npos) break;
	                    start = comma + 1;
	                }
	            }
	        }
	        if (voiceCandidates.empty()) voiceCandidates.push_back("");

	        int lastExitCode = 0;
	        std::string lastCmd;
	        for (const auto& voice : voiceCandidates)
	        {
	            if (engine.find("flite") != std::string::npos)
	            {
	                std::string voiceArg;
	                if (!voice.empty()) voiceArg = " -voice " + shell_quote(voice);
	                cmd = shell_quote(engine) + voiceArg + " -t " + shell_quote(text) + " -o " + shell_quote(wav.string());
	            }
	            else
	            {
	                // Slow down / speed up speech when using espeak/espeak-ng. Default is ~175 WPM.
	                std::string speedArg;
	                std::string voiceArg;
	                if (engine == "espeak" || engine == "espeak-ng" ||
	                    engine.find("/espeak") != std::string::npos || engine.find("/espeak-ng") != std::string::npos)
	                {
	                    const int wpm = std::max(80, std::min(450, tts_.speed_wpm));
	                    speedArg = " -s " + std::to_string(wpm);
	                    if (!voice.empty()) voiceArg = " -v " + shell_quote(voice);
	                }
	                cmd = shell_quote(engine) + speedArg + voiceArg + " -w " + shell_quote(wav.string()) + " " + shell_quote(text);
	            }

	            lastCmd = cmd;
	            const int rc = std::system(cmd.c_str());
	            if (rc == 0)
	            {
	                lastExitCode = 0;
	                break;
	            }
	            lastExitCode = (rc == -1) ? -1 : (WIFEXITED(rc) ? WEXITSTATUS(rc) : rc);
	        }
	        if (lastExitCode != 0)
	        {
	            err = "TTS command failed with exit code " + std::to_string(lastExitCode) + ": " + lastCmd;
	            return false;
	        }
	        if (!std::filesystem::exists(wav, ec) || std::filesystem::file_size(wav, ec) == 0)
	        {
	            err = "TTS command did not create a WAV file.";
	            return false;
	        }

        path = wav.string();
        return true;
    }

    bool append_tts_audio_paths_locked(AlarmState& alarm, const std::string& text, std::string& err) const
    {
        const std::vector<TtsPart> parts = parse_tts_parts(text);
        if (parts.empty())
        {
            err = "TTS text is empty.";
            return false;
        }

        bool added = false;
        for (const auto& part : parts)
        {
            std::string path;
            if (part.pause)
            {
                if (!generate_silence_wav_locked(part.pause_ms, path, err)) return false;
                alarm.audio_files.push_back("pause");
            }
            else
            {
                if (!generate_tts_wav_locked(part.text, path, err)) return false;
                alarm.audio_files.push_back("tts");
            }

            alarm.audio_paths.push_back(path);
            if (alarm.audio_file.empty()) alarm.audio_file = part.pause ? "pause" : "tts";
            if (alarm.audio_path.empty()) alarm.audio_path = path;
            added = true;
        }

        if (!added) err = "TTS text is empty.";
        return added;
    }

    void add_tts_audio_paths_locked(AlarmState& alarm) const
    {
        if (alarm.speech_texts.empty()) return;
        if (alarm.audio_mode == "audio_only") return;

        std::vector<std::string> priorFiles;
        std::vector<std::string> priorPaths;
        const bool ttsFirst = (alarm.audio_mode == "speech_then_audio");
        if (alarm.audio_mode == "speech_only" || ttsFirst)
        {
            priorFiles = alarm.audio_files;
            priorPaths = alarm.audio_paths;
            alarm.audio_files.clear();
            alarm.audio_paths.clear();
            alarm.audio_file.clear();
            alarm.audio_path.clear();
        }
        for (const auto& text : alarm.speech_texts)
        {
            std::string err;
            if (!append_tts_audio_paths_locked(alarm, text, err))
            {
                std::cerr << "[alarms] TTS generation failed for alarm " << alarm.alarm_id << ": " << err << "\n";
                continue;
            }
        }
        if (ttsFirst)
        {
            alarm.audio_files.insert(alarm.audio_files.end(), priorFiles.begin(), priorFiles.end());
            alarm.audio_paths.insert(alarm.audio_paths.end(), priorPaths.begin(), priorPaths.end());
            if (!alarm.audio_files.empty()) alarm.audio_file = alarm.audio_files.front();
            if (!alarm.audio_paths.empty()) alarm.audio_path = alarm.audio_paths.front();
        }
    }

    void add_voice_contact_job_locked(const Policy& policy, const Contact& contact, const AlarmState& alarm, const std::string& event_type, std::unordered_set<std::string>& seen)
    {
        if (!contact.enabled) return;
        if (contact.phone.empty()) return;
        if (!seen.insert(contact.id).second) return;

        Route r;
        r.name = policy.name.empty() ? ("voice_modem:" + policy.id) : ("voice_modem:" + policy.name);
        r.type = "voice_modem";
        r.enabled = true;
        r.min_severity = policy.min_severity;
        r.on = policy.on;
        r.repeat_ms = policy.repeat_ms;
        r.until = policy.until;
        r.repeat_initial_delay_ms = policy.repeat_initial_delay_ms;
        r.max_repeats = policy.max_repeats;
        r.schedule_id = policy.schedule_id;

        Job job;
        job.route = std::move(r);
        job.alarm = alarm;
        job.event_type = event_type;
        job.due_ms = now_ms();
        job.phone = contact.phone;
        job.contact_id = contact.id;
        job.contact_name = contact.name;
        job.policy_id = policy.id;
        if (policy.max_repeats <= 0) job.repeats_left = -1;
        else job.repeats_left = std::max(0, policy.max_repeats - 1);
        job.audio_delay_seconds = contact.audio_delay_seconds >= 0 ? contact.audio_delay_seconds : policy.audio_delay_seconds;
        job.audio_gap_ms = (alarm.audio_gap_ms >= 0) ? alarm.audio_gap_ms : policy.audio_gap_ms;
        job.ack_dtmf = policy.ack_enabled ? policy.ack_dtmf : std::vector<std::string>{};
        job.ack_wait_sec = policy.ack_enabled ? policy.ack_wait_sec : 0;
        modem_jobs_.push_back(std::move(job));
    }

    static std::string contact_phone_for_method(const Contact& c, const std::string& method)
    {
        const std::string m = method.empty() ? "cell" : method;
        if (m == "home") return c.phone_home.empty() ? c.phone : c.phone_home;
        if (m == "work") return c.phone_work.empty() ? c.phone : c.phone_work;
        if (m == "cell") return c.phone_cell.empty() ? c.phone : c.phone_cell;
        return c.phone.empty() ? (!c.phone_cell.empty() ? c.phone_cell : (!c.phone_work.empty() ? c.phone_work : c.phone_home)) : c.phone;
    }

    static std::string email_subject_for_alarm(const AlarmState& alarm, const std::string& event_type)
    {
        return "OPC Bridge alarm " + event_type + ": " + (alarm.name.empty() ? alarm.alarm_id : alarm.name);
    }

    static std::string email_body_for_alarm(const AlarmState& alarm, const std::string& event_type)
    {
        std::ostringstream ss;
        ss << "Alarm event: " << event_type << "\n";
        ss << "Alarm: " << (alarm.name.empty() ? alarm.alarm_id : alarm.name) << "\n";
        ss << "Alarm ID: " << alarm.alarm_id << "\n";
        ss << "Severity: " << alarm.severity << "\n";
        if (!alarm.group.empty()) ss << "Group: " << alarm.group << "\n";
        if (!alarm.site.empty()) ss << "Site: " << alarm.site << "\n";
        if (!alarm.connection_id.empty()) ss << "Connection: " << alarm.connection_id << "\n";
        if (!alarm.tag.empty()) ss << "Tag: " << alarm.tag << "\n";
        ss << "Message: " << alarm.message << "\n";
        ss << "\nGenerated by opcbridge-alarms.\n";
        return ss.str();
    }

    static void replace_all_inplace(std::string& s, const std::string& from, const std::string& to)
    {
        if (from.empty()) return;
        size_t pos = 0;
        while ((pos = s.find(from, pos)) != std::string::npos)
        {
            s.replace(pos, from.size(), to);
            pos += to.size();
        }
    }

    static std::string render_email_template(std::string templ, const AlarmState& alarm, const std::string& event_type)
    {
        replace_all_inplace(templ, "{event}", event_type);
        replace_all_inplace(templ, "{alarm_name}", alarm.name.empty() ? alarm.alarm_id : alarm.name);
        replace_all_inplace(templ, "{alarm_id}", alarm.alarm_id);
        replace_all_inplace(templ, "{severity}", std::to_string(alarm.severity));
        replace_all_inplace(templ, "{group}", alarm.group);
        replace_all_inplace(templ, "{site}", alarm.site);
        replace_all_inplace(templ, "{connection_id}", alarm.connection_id);
        replace_all_inplace(templ, "{tag}", alarm.tag);
        replace_all_inplace(templ, "{message}", alarm.message);
        return templ;
    }

    bool send_email_via_smtp(const std::string& to, const std::string& subject, const std::string& body, std::string& result)
    {
        SmtpConfig smtp;
        {
            std::lock_guard<std::mutex> lock(mu_);
            smtp = smtp_;
        }
        if (!smtp.enabled) { result = "SMTP is disabled"; return false; }
        if (smtp.host.empty()) { result = "SMTP host is not configured"; return false; }
        if (smtp.from_address.empty()) { result = "SMTP from address is not configured"; return false; }
        if (to.empty()) { result = "recipient email is empty"; return false; }
        if (!command_exists("curl")) { result = "curl is required for SMTP email"; return false; }

        const std::filesystem::path tmpdir = std::filesystem::path("/tmp") / ("opcbridge-email-" + random_hex(8));
        std::error_code ec;
        std::filesystem::create_directories(tmpdir, ec);
        if (ec) { result = "failed to create temp dir: " + ec.message(); return false; }

        const std::filesystem::path msgPath = tmpdir / "message.eml";
        const std::filesystem::path cfgPath = tmpdir / "curl.conf";
        auto curl_escape = [](const std::string& s) {
            std::string out;
            out.reserve(s.size());
            for (char ch : s)
            {
                if (ch == '\\' || ch == '"') out.push_back('\\');
                out.push_back(ch);
            }
            return out;
        };
        {
            std::ofstream msg(msgPath, std::ios::binary | std::ios::trunc);
            msg << "From: " << (smtp.from_name.empty() ? smtp.from_address : (smtp.from_name + " <" + smtp.from_address + ">")) << "\r\n";
            msg << "To: " << to << "\r\n";
            msg << "Subject: " << subject << "\r\n";
            msg << "Content-Type: text/plain; charset=utf-8\r\n";
            msg << "\r\n";
            msg << body << "\r\n";
        }
        {
            std::ofstream cfg(cfgPath, std::ios::binary | std::ios::trunc);
            cfg << "url = \"" << (smtp.security == "tls" ? "smtps://" : "smtp://") << curl_escape(smtp.host) << ":" << smtp.port << "\"\n";
            cfg << "mail-from = \"" << curl_escape(smtp.from_address) << "\"\n";
            cfg << "mail-rcpt = \"" << curl_escape(to) << "\"\n";
            cfg << "upload-file = \"" << curl_escape(msgPath.string()) << "\"\n";
            cfg << "max-time = " << smtp.timeout_sec << "\n";
            cfg << "silent\nshow-error\n";
            if (smtp.security == "starttls") cfg << "ssl-reqd\n";
            if (!smtp.username.empty()) cfg << "user = \"" << curl_escape(smtp.username + ":" + smtp.password) << "\"\n";
        }
        ::chmod(cfgPath.c_str(), 0600);

        int rc = -1;
        const std::string cmd = "curl --config " + shell_quote(cfgPath.string()) + " 2>&1";
        const std::string out = exec_capture(cmd, rc, 64 * 1024);
        std::filesystem::remove_all(tmpdir, ec);
        if (rc == 0)
        {
            result = "email sent to " + to;
            return true;
        }
        result = "email failed rc=" + std::to_string(rc) + (out.empty() ? "" : (" " + out));
        return false;
    }

    bool run_email_job(const Job& job, std::string& result)
    {
        const std::string subject = job.email_subject.empty() ? email_subject_for_alarm(job.alarm, job.event_type) : job.email_subject;
        const std::string body = job.email_body.empty() ? email_body_for_alarm(job.alarm, job.event_type) : job.email_body;
        return send_email_via_smtp(job.email, subject, body, result);
    }

    const Route* select_audio_route_for_policy_locked() const
    {
        const Route* firstEnabledAudio = nullptr;
        for (const auto& route : routes_)
        {
            if (route.type != "audio_command" || route.command.empty() || !route.enabled) continue;
            if (!firstEnabledAudio) firstEnabledAudio = &route;
            if (route.name == "default_audio") return &route;
        }
        return firstEnabledAudio;
    }

    bool enqueue_audio_policy_job_locked(const Policy& policy,
                                         const AlarmState& alarm,
                                         const std::string& event_type,
                                         const std::string& schedule_id_override,
                                         const std::string& scope_name)
    {
        const Route* baseRoute = select_audio_route_for_policy_locked();
        if (!baseRoute)
        {
            record_policy_skip_locked(scope_name, policy.id, event_type, alarm.alarm_id, "no enabled audio_command route configured");
            return false;
        }
        if (route_needs_audio_path(*baseRoute) && alarm.audio_path.empty())
        {
            record_policy_skip_locked(scope_name, policy.id, event_type, alarm.alarm_id, "audio route requires audio path but alarm has no audio");
            return false;
        }

        Job job;
        job.route = *baseRoute;
        job.route.name = policy.name.empty() ? ("audio_policy:" + policy.id) : ("audio_policy:" + policy.name);
        job.route.repeat_ms = policy.repeat_ms;
        job.route.repeat_initial_delay_ms = policy.repeat_initial_delay_ms;
        job.route.until = policy.until;
        job.route.max_repeats = policy.max_repeats;
        job.route.schedule_id = schedule_id_override.empty() ? policy.schedule_id : schedule_id_override;
        job.alarm = alarm;
        job.event_type = event_type;
        job.policy_id = policy.id;
        if (policy.max_repeats <= 0) job.repeats_left = -1;
        else job.repeats_left = std::max(0, policy.max_repeats - 1);
        job.audio_gap_ms = policy.audio_gap_ms;
        const int64_t tNow = now_ms();
        job.due_ms = tNow + ((event_type == "active") ? std::max<int64_t>(0, policy.repeat_initial_delay_ms) : 0LL);
        apply_audio_default_arg(job);
        audio_jobs_.push_back(std::move(job));
        return true;
    }

    bool enqueue_policy_output_locked(const Policy& policy,
                                      const std::string& schedule_id_override,
                                      const AlarmState& alarm,
                                      const std::string& event_type,
                                      const std::string& scope_name)
    {
        if (!policy.enabled) return false;
        if (alarm.severity < policy.min_severity) return false;
        if (!vector_contains(policy.on, event_type)) return false;
        const std::string effectiveScheduleId = schedule_id_override.empty() ? policy.schedule_id : schedule_id_override;
        if (!schedule_is_active_locked(effectiveScheduleId))
        {
            record_schedule_skip_locked("alarm_route", scope_name.empty() ? policy.id : scope_name, effectiveScheduleId, event_type, alarm.alarm_id);
            return false;
        }

	        if (policy.output_type == "audio")
	        {
	            return enqueue_audio_policy_job_locked(policy, alarm, event_type, effectiveScheduleId, scope_name);
	        }
	        if (policy.output_type == "email")
	        {
	            if (!smtp_.enabled || smtp_.host.empty())
	            {
	                record_policy_skip_locked(scope_name, policy.id, event_type, alarm.alarm_id, "SMTP is not configured");
	                return false;
	            }
	            std::unordered_set<std::string> seen_email;
	            int enqueued = 0;
	            auto push_email = [&](const Contact& c, int64_t after_ms) {
	                if (!c.enabled || c.email.empty()) return;
	                if (!seen_email.insert(c.email).second) return;
	                Job job;
	                job.route.name = policy.name.empty() ? ("email_policy:" + policy.id) : ("email_policy:" + policy.name);
	                job.route.type = "email";
	                job.route.enabled = true;
	                job.route.min_severity = policy.min_severity;
	                job.route.on = policy.on;
	                job.route.repeat_ms = policy.repeat_ms;
	                job.route.until = policy.until;
	                job.route.repeat_initial_delay_ms = policy.repeat_initial_delay_ms;
	                job.route.max_repeats = policy.max_repeats;
	                job.route.schedule_id = effectiveScheduleId;
	                job.alarm = alarm;
	                job.event_type = event_type;
	                job.due_ms = now_ms() + std::max<int64_t>(0, after_ms);
	                job.email = c.email;
	                job.email_subject = policy.email_subject_template.empty()
	                    ? std::string()
	                    : render_email_template(policy.email_subject_template, alarm, event_type);
	                const std::string bodyTemplate = (event_type == "return")
	                    ? policy.email_clear_body_template
	                    : policy.email_active_body_template;
	                job.email_body = bodyTemplate.empty()
	                    ? std::string()
	                    : render_email_template(bodyTemplate, alarm, event_type);
	                job.contact_id = c.id;
	                job.contact_name = c.name;
	                job.policy_id = policy.id;
	                if (policy.max_repeats <= 0) job.repeats_left = -1;
	                else job.repeats_left = std::max(0, policy.max_repeats - 1);
	                modem_jobs_.push_back(std::move(job));
	                ++enqueued;
	            };
	            for (const auto& target : policy.targets)
	            {
	                if (target.type == "contact")
	                {
	                    auto it = contacts_.find(target.id);
	                    if (it != contacts_.end()) push_email(it->second, target.after_ms);
	                }
	                else if (target.type == "group")
	                {
	                    auto git = contact_groups_.find(target.id);
	                    if (git == contact_groups_.end() || !git->second.enabled) continue;
	                    for (const auto& cid : git->second.contacts)
	                    {
	                        auto it = contacts_.find(cid);
	                        if (it != contacts_.end()) push_email(it->second, target.after_ms);
	                    }
	                }
	            }
	            if (enqueued == 0)
	            {
	                record_policy_skip_locked(scope_name, policy.id, event_type, alarm.alarm_id, "policy produced no email targets");
	                return false;
	            }
	            modem_cv_.notify_all();
	            return true;
	        }
		        const bool isPhone = (policy.output_type == "phone");
		        if (!isPhone)
		        {
		            // Per current UX, "call" is a single policy type. SIP is a backend, not a policy type.
		            return false;
		        }
                // Phone/call policies can be delivered by SIP and/or voice modem.
                // Backend availability rules:
                // - For forced backends (policy.call_backend), we only require the backend to be configured.
                // - For auto selection, we require both "enabled" + configured.
                const bool sipConfigured = !sip_.server.empty() && !sip_.ext.empty() && !sip_.pass.empty();
                const bool vmConfigured = !voice_modem_.device.empty();
                const bool sipAvailable = (policy.call_backend == "sip") ? sipConfigured : (sip_.enabled && sipConfigured);
                const bool vmAvailable = (policy.call_backend == "voice_modem") ? vmConfigured : (voice_modem_.enabled && vmConfigured);
                if (!sipAvailable && !vmAvailable)
                {
                    record_policy_skip_locked(scope_name, policy.id, event_type, alarm.alarm_id, "no call backend configured (enable SIP or Voice Modem)");
                    return false;
                }

	        std::unordered_set<std::string> seen_dial;
	        std::vector<Job::CallLeg> legs;
	        legs.reserve(policy.targets.size());

	        auto push_leg = [&](const Contact& c, const std::string& method, int64_t after_ms) {
	            if (!c.enabled) return;
	            const std::string dial = contact_phone_for_method(c, method);
	            if (dial.empty()) return;
	            if (!seen_dial.insert(dial).second) return;
	            Job::CallLeg leg;
	            leg.contact_id = c.id;
	            leg.contact_name = c.name;
	            leg.phone = dial;
	            leg.after_ms = std::max<int64_t>(0, after_ms);
	            leg.audio_delay_seconds = c.audio_delay_seconds;
	            legs.push_back(std::move(leg));
	        };

	        for (const auto& target : policy.targets)
	        {
	            if (target.type == "contact")
	            {
	                auto it = contacts_.find(target.id);
	                if (it != contacts_.end()) push_leg(it->second, target.method, target.after_ms);
	            }
	            else if (target.type == "group")
	            {
	                auto git = contact_groups_.find(target.id);
	                if (git == contact_groups_.end() || !git->second.enabled) continue;
	                for (const auto& cid : git->second.contacts)
	                {
	                    auto it = contacts_.find(cid);
	                    if (it != contacts_.end()) push_leg(it->second, target.method, target.after_ms);
	                }
	            }
	        }

	        if (legs.empty())
        {
            record_policy_skip_locked(scope_name, policy.id, event_type, alarm.alarm_id,
                "policy produced no callable targets");
            return false;
        }

	        Job job;
	        job.route.name = policy.name.empty() ? ("phone_policy:" + policy.id) : ("phone_policy:" + policy.name);
	        job.route.type = "call_sequence";
	        job.event_type = event_type;
	        job.policy_id = policy.id;
	        job.call_backend = policy.call_backend;
	        job.route.repeat_ms = policy.repeat_ms;
	        job.route.repeat_initial_delay_ms = policy.repeat_initial_delay_ms;
	        job.route.max_repeats = policy.max_repeats;
	        job.route.until = policy.until;
	        job.route.schedule_id = effectiveScheduleId;
	        job.alarm = alarm;
	        job.ack_dtmf = policy.ack_enabled ? policy.ack_dtmf : std::vector<std::string>{};
	        job.ack_wait_sec = policy.ack_enabled ? policy.ack_wait_sec : 0;
	        job.ring_timeout_sec = policy.ring_timeout_sec;
	        // max_rings removed
	        if (policy.max_repeats <= 0) job.repeats_left = -1;
	        else job.repeats_left = std::max(0, policy.max_repeats - 1);
	        job.audio_delay_seconds = policy.audio_delay_seconds;
	        job.audio_gap_ms = (alarm.audio_gap_ms >= 0) ? alarm.audio_gap_ms : policy.audio_gap_ms;
	        job.call_legs = std::move(legs);
	        const int64_t initialDelay = (event_type == "active") ? std::max<int64_t>(0, policy.repeat_initial_delay_ms) : 0LL;
	        const int64_t firstAfter = job.call_legs.empty() ? 0LL : std::max<int64_t>(0, job.call_legs.front().after_ms);
	        job.due_ms = now_ms() + initialDelay + firstAfter;
	        if (!job.call_legs.empty())
	        {
	            log_escalation_locked(
	                "queued_sequence",
	                job,
	                "legs=" + std::to_string(job.call_legs.size()) + " due_in_ms=" + std::to_string(std::max<int64_t>(0, job.due_ms - now_ms())),
	                job.call_legs.front().contact_id,
	                job.call_legs.front().contact_name,
	                job.call_legs.front().phone
	            );
	        }
	        modem_jobs_.push_back(std::move(job));
        return true;
    }

    void enqueue_policy_jobs_locked(const AlarmState& alarm, const std::string& event_type)
    {
        bool matchedAlarmRoute = false;
        std::unordered_set<std::string> enqueuedRoutePolicies;
        for (const auto& route : alarm_route_bindings_)
        {
            if (!route.enabled) continue;
            if (!vector_contains(route.alarms, alarm.alarm_id)) continue;
            matchedAlarmRoute = true;
            for (const auto& policyId : route.policy_ids)
            {
                const Policy* policy = find_policy_locked(policyId);
                if (!policy) continue;
                const std::string dedupeKey = policy->id + "\n" + route.schedule_id;
                if (!enqueuedRoutePolicies.insert(dedupeKey).second) continue;
                enqueue_policy_output_locked(*policy, route.schedule_id, alarm, event_type, route.name.empty() ? route.id : route.name);
            }
        }
        if (matchedAlarmRoute) return;

        std::string selectedPolicyId = resolve_policy_for_alarm_locked(alarm);
        if (selectedPolicyId.empty()) selectedPolicyId = alarm.notification_policy;
        if (selectedPolicyId.empty()) return;
        const Policy* policy = find_policy_locked(selectedPolicyId);
        if (!policy) return;
        enqueue_policy_output_locked(*policy, policy->schedule_id, alarm, event_type, policy->id);
    }

    const Policy* find_policy_locked(const std::string& id_or_name) const
    {
        auto pit = policies_.find(id_or_name);
        if (pit != policies_.end()) return &pit->second;
        auto aliasIt = policy_name_to_id_.find(id_or_name);
        if (aliasIt == policy_name_to_id_.end()) return nullptr;
        pit = policies_.find(aliasIt->second);
        if (pit == policies_.end()) return nullptr;
        return &pit->second;
    }

    bool schedule_is_active_locked(const std::string& schedule_id) const
    {
        // Option A: "always" is a virtual/implicit schedule id and must always be active,
        // regardless of whether a user-defined schedule row with id="always" exists.
        // (This prevents misconfiguration where an "always" schedule is actually custom/weekday-only.)
        auto trim_ws = [](const std::string& in) -> std::string {
            size_t b = 0;
            while (b < in.size() && std::isspace(static_cast<unsigned char>(in[b]))) b++;
            size_t e = in.size();
            while (e > b && std::isspace(static_cast<unsigned char>(in[e - 1]))) e--;
            return in.substr(b, e - b);
        };
        const std::string sid = trim_ws(schedule_id);
        if (sid.empty() || sid == "always") return true;
        std::unordered_set<std::string> visiting;
        return schedule_is_active_recursive_locked(sid, visiting);
    }

    bool schedule_is_active_recursive_locked(const std::string& schedule_id, std::unordered_set<std::string>& visiting) const
    {
        auto it = schedules_.find(schedule_id);
        if (it == schedules_.end()) return schedule_id == "always";
        if (!visiting.insert(schedule_id).second) return false;

        const Schedule& s = it->second;
        bool out = true;
        if (s.type == "always")
        {
            out = true;
        }
        else if (s.type == "custom")
        {
            std::time_t t = std::time(nullptr);
            std::tm localTm {};
#if defined(_WIN32)
            localtime_s(&localTm, &t);
#else
            localtime_r(&t, &localTm);
#endif
            auto parse_ymd = [](const std::string& text, int& outYmd) -> bool {
                if (text.size() != 10 || text[4] != '-' || text[7] != '-') return false;
                for (size_t i = 0; i < text.size(); ++i)
                {
                    if (i == 4 || i == 7) continue;
                    if (!std::isdigit(static_cast<unsigned char>(text[i]))) return false;
                }
                const int yyyy = std::stoi(text.substr(0, 4));
                const int mm = std::stoi(text.substr(5, 2));
                const int dd = std::stoi(text.substr(8, 2));
                outYmd = (yyyy * 10000) + (mm * 100) + dd;
                return true;
            };
            auto parse_hhmm = [](const std::string& text, int& outMin) -> bool {
                if (text.size() != 5 || text[2] != ':') return false;
                if (!std::isdigit(static_cast<unsigned char>(text[0])) || !std::isdigit(static_cast<unsigned char>(text[1])) ||
                    !std::isdigit(static_cast<unsigned char>(text[3])) || !std::isdigit(static_cast<unsigned char>(text[4]))) return false;
                const int hh = (text[0] - '0') * 10 + (text[1] - '0');
                const int mm = (text[3] - '0') * 10 + (text[4] - '0');
                if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return false;
                outMin = hh * 60 + mm;
                return true;
            };
            const int nowYmd = ((localTm.tm_year + 1900) * 10000) + ((localTm.tm_mon + 1) * 100) + localTm.tm_mday;
            const int day = localTm.tm_wday;
            const int minuteOfDay = (localTm.tm_hour * 60) + localTm.tm_min;
            if (s.custom_has_days && (day < 0 || day > 6 || !s.custom_days[static_cast<size_t>(day)]))
            {
                out = false;
            }
            if (out && !s.start_date.empty())
            {
                int ymd = 0;
                if (parse_ymd(s.start_date, ymd) && nowYmd < ymd) out = false;
            }
            if (out && !s.end_date.empty())
            {
                int ymd = 0;
                if (parse_ymd(s.end_date, ymd) && nowYmd > ymd) out = false;
            }
            if (out)
            {
                const bool hasStart = !s.start_time.empty();
                const bool hasEnd = !s.end_time.empty();
                if (hasStart && hasEnd)
                {
                    int start = 0, end = 0;
                    if (parse_hhmm(s.start_time, start) && parse_hhmm(s.end_time, end))
                    {
                        if (start == end) out = true;
                        else if (start < end) out = (minuteOfDay >= start && minuteOfDay < end);
                        else out = (minuteOfDay >= start || minuteOfDay < end);
                    }
                }
            }
        }
        else if (s.type == "inverse_of")
        {
            out = !schedule_is_active_recursive_locked(s.schedule_id.empty() ? "always" : s.schedule_id, visiting);
        }
        visiting.erase(schedule_id);
        return out;
    }

    std::string resolve_policy_for_alarm_locked(const AlarmState& alarm) const
    {
        int bestClass = 99;
        int bestPriority = std::numeric_limits<int>::max();
        std::string bestAssignmentId;
        std::string bestPlanId;

        auto assignment_class = [](const Assignment& a) -> int {
            if (!a.alarm_id.empty()) return 0;
            if (!a.group.empty() && !a.site.empty()) return 1;
            if (!a.group.empty()) return 2;
            if (a.severity_min.has_value() || a.severity_max.has_value()) return 3;
            return 90;
        };
        auto matches = [&](const Assignment& a) -> bool {
            if (!a.enabled || a.plan_id.empty()) return false;
            if (!a.alarm_id.empty()) return a.alarm_id == alarm.alarm_id;
            if (!a.group.empty())
            {
                if (a.group != alarm.group) return false;
                if (!a.site.empty()) return a.site == alarm.site;
                return true;
            }
            if (a.severity_min.has_value() || a.severity_max.has_value())
            {
                const int minv = a.severity_min.value_or(std::numeric_limits<int>::min());
                const int maxv = a.severity_max.value_or(std::numeric_limits<int>::max());
                return alarm.severity >= minv && alarm.severity <= maxv;
            }
            return false;
        };

        for (const auto& a : assignments_)
        {
            if (!matches(a)) continue;
            if (!find_policy_locked(a.plan_id)) continue;
            const int klass = assignment_class(a);
            if (klass < bestClass ||
                (klass == bestClass && (a.priority < bestPriority || (a.priority == bestPriority && a.id < bestAssignmentId))))
            {
                bestClass = klass;
                bestPriority = a.priority;
                bestAssignmentId = a.id;
                bestPlanId = a.plan_id;
            }
        }
        return bestPlanId;
    }

    void record_schedule_skip_locked(const std::string& scope,
                                     const std::string& name,
                                     const std::string& schedule_id,
                                     const std::string& event_type,
                                     const std::string& alarm_id)
    {
        schedule_skips_++;
        last_schedule_skip_ts_ms_ = now_ms();
        last_schedule_skip_scope_ = scope;
        last_schedule_skip_name_ = name;
        last_schedule_skip_schedule_id_ = schedule_id;
        last_schedule_skip_event_type_ = event_type;
        last_schedule_skip_alarm_id_ = alarm_id;
    }

    void record_policy_skip_locked(const std::string& scope_name,
                                   const std::string& policy_id,
                                   const std::string& event_type,
                                   const std::string& alarm_id,
                                   const std::string& reason)
    {
        last_policy_skip_ts_ms_ = now_ms();
        last_policy_skip_scope_name_ = scope_name;
        last_policy_skip_policy_id_ = policy_id;
        last_policy_skip_event_type_ = event_type;
        last_policy_skip_alarm_id_ = alarm_id;
        last_policy_skip_reason_ = reason;
    }

    static std::string format_arg(std::string value, const AlarmState& alarm)
    {
        auto replace_all = [&](const std::string& from, const std::string& to) {
            size_t pos = 0;
            while ((pos = value.find(from, pos)) != std::string::npos)
            {
                value.replace(pos, from.size(), to);
                pos += to.size();
            }
        };
        replace_all("{alarm_id}", alarm.alarm_id);
        replace_all("{name}", alarm.name);
        replace_all("{group}", alarm.group);
        replace_all("{site}", alarm.site);
        replace_all("{message}", alarm.message);
        replace_all("{connection_id}", alarm.connection_id);
        replace_all("{tag}", alarm.tag);
        replace_all("{severity}", std::to_string(alarm.severity));
        replace_all("{audio_file}", alarm.audio_file);
        replace_all("{audio_path}", alarm.audio_path);
        return value;
    }

    static std::string basename_for_summary(const std::string& path)
    {
        const auto slash = path.find_last_of('/');
        return slash == std::string::npos ? path : path.substr(slash + 1);
    }

    static std::string audio_sequence_summary(const AlarmState& alarm)
    {
        const std::vector<std::string> paths = !alarm.audio_paths.empty()
            ? alarm.audio_paths
            : (alarm.audio_path.empty() ? std::vector<std::string>{} : std::vector<std::string>{alarm.audio_path});
        if (paths.empty()) return "none";

        std::string out;
        for (const auto& path : paths)
        {
            if (path.empty()) continue;
            if (!out.empty()) out += " -> ";
            out += basename_for_summary(path);
        }
        return out.empty() ? "none" : out;
    }

    static AlarmState alarm_with_audio_path(const AlarmState& alarm, size_t index)
    {
        AlarmState copy = alarm;
        if (index < alarm.audio_files.size()) copy.audio_file = alarm.audio_files[index];
        if (index < alarm.audio_paths.size()) copy.audio_path = alarm.audio_paths[index];
        return copy;
    }

    void apply_audio_default_arg(Job& job) const
    {
        if (job.route.type != "audio_command") return;
        if (!job.route.args.empty()) return;
        const std::string path = !job.alarm.audio_paths.empty() ? job.alarm.audio_paths.front() : job.alarm.audio_path;
        if (path.empty()) return;
        job.route.args.push_back(path);
    }

    static bool route_needs_audio_path(const Route& route)
    {
        if (route.args.empty()) return true;
        for (const auto& arg : route.args)
        {
            if (arg.find("{audio_path}") != std::string::npos || arg.find("{audio_file}") != std::string::npos) return true;
        }
        return false;
    }

    static std::string command_string(const Job& job)
    {
        if (job.route.type == "voice_modem")
        {
            return "voice_modem contact=" + job.contact_id + " phone=" + job.phone + " policy=" + job.policy_id + " audio=" + audio_sequence_summary(job.alarm);
        }
        if (job.route.type == "email")
        {
            return "email contact=" + job.contact_id + " to=" + job.email + " policy=" + job.policy_id;
        }
        std::string out = job.route.command;
        for (const auto& arg : job.route.args)
        {
            out += " ";
            out += format_arg(arg, job.alarm);
        }
        return out;
    }

    static int run_command(const Job& job)
    {
        std::vector<std::string> args;
        args.push_back(job.route.command);
        for (const auto& arg : job.route.args) args.push_back(format_arg(arg, job.alarm));

        std::vector<char*> argv;
        argv.reserve(args.size() + 1);
        for (auto& arg : args) argv.push_back(arg.data());
        argv.push_back(nullptr);

        pid_t pid = fork();
        if (pid < 0) return -1;
        if (pid == 0)
        {
            execvp(argv[0], argv.data());
            _exit(127);
        }

        int status = 0;
        if (waitpid(pid, &status, 0) < 0) return -1;
        if (WIFEXITED(status)) return WEXITSTATUS(status);
        if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
        return -1;
    }

	    static int run_audio_command_sequence(const Job& job)
	    {
	        if (job.alarm.audio_paths.size() <= 1) return run_command(job);

        int lastRc = 0;
        const int gapMs = std::max(0, std::min(5000, job.audio_gap_ms));
        for (size_t i = 0; i < job.alarm.audio_paths.size(); ++i)
        {
            Job part = job;
            part.alarm = alarm_with_audio_path(job.alarm, i);
            if (part.alarm.audio_path.empty()) continue;
            lastRc = run_command(part);
            if (lastRc != 0) return lastRc;
            if (gapMs > 0 && (i + 1) < job.alarm.audio_paths.size())
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(gapMs));
            }
        }
	        return lastRc;
	    }

	    bool run_sip_call(const Job& job, std::string& result)
	    {
	        SipConfig sip;
	        {
	            std::lock_guard<std::mutex> lock(mu_);
	            sip = sip_;
	        }
	        if (!sip.enabled)
	        {
	            result = "sip is disabled";
	            return false;
	        }
	        if (sip.server.empty() || sip.ext.empty() || sip.pass.empty())
	        {
	            result = "sip is not configured (missing server/ext/pass)";
	            return false;
	        }

	        std::string host = sip.server;
	        std::string port = "5060";
	        const auto colon = sip.server.find(':');
	        if (colon != std::string::npos)
	        {
	            host = sip.server.substr(0, colon);
	            port = sip.server.substr(colon + 1);
	            if (host.empty()) host = sip.server;
	            if (port.empty()) port = "5060";
	        }

	        std::string netIf = sip.net_if;
	        if (netIf.empty())
	        {
	            netIf = detect_route_interface_for_host(host);
	        }

	        const std::filesystem::path tmpdir = std::filesystem::path("/tmp") / ("opcbridge-sipcall-" + random_hex(8));
	        std::error_code ec;
	        std::filesystem::create_directories(tmpdir, ec);
	        if (ec)
	        {
	            result = "Failed to create temp dir: " + ec.message();
	            return false;
	        }

	        std::string dest = job.phone.empty() ? "" : job.phone;
	        if (dest.empty())
	        {
	            result = "sip call missing destination";
	            std::filesystem::remove_all(tmpdir, ec);
	            return false;
	        }
	        if (dest.rfind("sip:", 0) != 0)
	        {
	            const std::string dial = sanitize_phone_number(dest);
	            if (dial.empty())
	            {
	                result = "sip call has no dialable destination";
	                std::filesystem::remove_all(tmpdir, ec);
	                return false;
	            }
	            dest = "sip:" + dial + "@" + host + ":" + port;
	        }

		        const int duration = std::max(5, std::min(300, sip.duration_sec));
		        const int ringTimeoutSec = std::max(5, std::min(600, job.ring_timeout_sec));
			        const bool ack_required = !job.ack_dtmf.empty() && job.ack_wait_sec > 0;

		        auto ack_prompt_text = [&]() -> std::string {
		            if (!ack_required) return "";
		            std::vector<std::string> keys;
		            keys.reserve(job.ack_dtmf.size());
		            for (const auto& k : job.ack_dtmf)
		            {
		                if (k.empty()) continue;
		                keys.push_back(std::string(1, k[0]));
		            }
		            if (keys.empty()) return "";
		            if (keys.size() == 1) return "Press " + keys[0] + " to acknowledge.";
		            if (keys.size() == 2) return "Press " + keys[0] + " or " + keys[1] + " to acknowledge.";
		            std::string out = "Press ";
		            for (size_t i = 0; i < keys.size(); ++i)
		            {
		                if (i == 0) out += keys[i];
		                else if (i + 1 == keys.size()) out += ", or " + keys[i];
		                else out += ", " + keys[i];
		            }
		            out += " to acknowledge.";
		            return out;
		        };

		        // Build the wav to play: prefer alarm audio sequence, else speech text (TTS).
		        auto parse_wav_pcm = [&](const std::string& path,
		                                 uint16_t& outChannels,
	                                 uint32_t& outRate,
	                                 uint16_t& outBps,
	                                 size_t& outDataOff,
	                                 size_t& outDataSize,
	                                 std::string& err) -> bool {
	            std::ifstream in(path, std::ios::binary);
	            if (!in) { err = "failed to open wav: " + path; return false; }
	            std::vector<uint8_t> data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
	            if (data.size() < 44) { err = "wav too small: " + path; return false; }
	            if (std::string(reinterpret_cast<const char*>(data.data()), 4) != "RIFF" ||
	                std::string(reinterpret_cast<const char*>(data.data() + 8), 4) != "WAVE")
	            {
	                err = "not a RIFF/WAVE file: " + path;
	                return false;
	            }
	            uint16_t audioFormat = 0;
	            uint16_t channels = 0;
	            uint32_t sampleRate = 0;
	            uint16_t bitsPerSample = 0;
	            size_t audioOff = 0;
	            size_t audioSize = 0;
	            size_t pos = 12;
	            auto rd16 = [&](size_t off) -> uint16_t {
	                if (off + 2 > data.size()) return 0;
	                return static_cast<uint16_t>(data[off]) | (static_cast<uint16_t>(data[off + 1]) << 8);
	            };
	            auto rd32 = [&](size_t off) -> uint32_t {
	                if (off + 4 > data.size()) return 0;
	                return static_cast<uint32_t>(data[off]) |
	                       (static_cast<uint32_t>(data[off + 1]) << 8) |
	                       (static_cast<uint32_t>(data[off + 2]) << 16) |
	                       (static_cast<uint32_t>(data[off + 3]) << 24);
	            };
	            while (pos + 8 <= data.size())
	            {
	                const std::string id(reinterpret_cast<const char*>(data.data() + pos), 4);
	                const uint32_t size = rd32(pos + 4);
	                const size_t chunkData = pos + 8;
	                if (chunkData + size > data.size()) break;
	                if (id == "fmt ")
	                {
	                    if (size < 16) { err = "invalid wav fmt chunk"; return false; }
	                    audioFormat = rd16(chunkData);
	                    channels = rd16(chunkData + 2);
	                    sampleRate = rd32(chunkData + 4);
	                    bitsPerSample = rd16(chunkData + 14);
	                }
	                else if (id == "data")
	                {
	                    audioOff = chunkData;
	                    audioSize = size;
	                }
	                pos = chunkData + size + (size % 2);
	            }
	            if (audioFormat != 1) { err = "only PCM wav supported for SIP playback: " + path; return false; }
	            if (channels < 1 || channels > 2) { err = "unsupported wav channels: " + path; return false; }
	            if (bitsPerSample != 8 && bitsPerSample != 16 && bitsPerSample != 24 && bitsPerSample != 32)
	            {
	                err = "unsupported wav bits/sample: " + path;
	                return false;
	            }
	            if (!audioOff || !audioSize) { err = "wav data chunk not found: " + path; return false; }
	            outChannels = channels;
	            outRate = sampleRate;
	            outBps = bitsPerSample;
	            outDataOff = audioOff;
	            outDataSize = audioSize;
	            return true;
	        };

	        auto concat_pcm_wavs = [&](const std::vector<std::string>& paths, int gapMs, const std::string& outPath, std::string& err) -> bool {
	            if (paths.empty()) { err = "no wav paths"; return false; }
	            uint16_t channels = 0;
	            uint32_t rate = 0;
	            uint16_t bps = 0;
	            std::vector<uint8_t> outData;
	            const int cleanGapMs = std::max(0, std::min(5000, gapMs));
	            for (const auto& p : paths)
	            {
	                if (p.empty()) continue;
	                std::ifstream in(p, std::ios::binary);
	                if (!in) { err = "failed to open wav: " + p; return false; }
	                std::vector<uint8_t> data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
	                uint16_t ch = 0;
	                uint32_t sr = 0;
	                uint16_t bits = 0;
	                size_t off = 0;
	                size_t sz = 0;
	                if (!parse_wav_pcm(p, ch, sr, bits, off, sz, err)) return false;
	                if (channels == 0) { channels = ch; rate = sr; bps = bits; }
	                else if (channels != ch || rate != sr || bps != bits)
	                {
	                    err = "wav formats must match to concatenate for SIP playback (channels/rate/bps mismatch): " + p;
	                    return false;
	                }
	                if (!outData.empty() && cleanGapMs > 0)
	                {
	                    const size_t bytesPerSample = static_cast<size_t>(channels) * static_cast<size_t>(bps / 8);
	                    const size_t gapFrames = static_cast<size_t>((static_cast<uint64_t>(rate) * static_cast<uint64_t>(cleanGapMs)) / 1000ULL);
	                    const size_t gapBytes = gapFrames * bytesPerSample;
	                    const uint8_t silenceByte = (bps == 8) ? 128 : 0;
	                    outData.insert(outData.end(), gapBytes, silenceByte);
	                }
	                if (off + sz > data.size()) { err = "wav data out of range: " + p; return false; }
	                outData.insert(outData.end(), data.begin() + static_cast<long>(off), data.begin() + static_cast<long>(off + sz));
	            }
	            if (channels == 0 || rate == 0 || bps == 0 || outData.empty())
	            {
	                err = "no playable wav data";
	                return false;
	            }
	            const uint32_t byteRate = rate * static_cast<uint32_t>(channels) * static_cast<uint32_t>(bps / 8);
	            const uint16_t blockAlign = static_cast<uint16_t>(channels * (bps / 8));
	            const uint32_t dataSize = static_cast<uint32_t>(std::min<size_t>(outData.size(), 0xFFFFFFFFu));
	            const uint32_t riffSize = 36u + dataSize;
	            std::ofstream out(outPath, std::ios::binary | std::ios::trunc);
	            if (!out) { err = "failed to write wav: " + outPath; return false; }
	            auto wr16 = [&](uint16_t v) {
	                out.put(static_cast<char>(v & 0xFF));
	                out.put(static_cast<char>((v >> 8) & 0xFF));
	            };
	            auto wr32 = [&](uint32_t v) {
	                out.put(static_cast<char>(v & 0xFF));
	                out.put(static_cast<char>((v >> 8) & 0xFF));
	                out.put(static_cast<char>((v >> 16) & 0xFF));
	                out.put(static_cast<char>((v >> 24) & 0xFF));
	            };
	            out.write("RIFF", 4);
	            wr32(riffSize);
	            out.write("WAVE", 4);
	            out.write("fmt ", 4);
	            wr32(16);
	            wr16(1); // PCM
	            wr16(channels);
	            wr32(rate);
	            wr32(byteRate);
	            wr16(blockAlign);
	            wr16(bps);
	            out.write("data", 4);
	            wr32(dataSize);
	            out.write(reinterpret_cast<const char*>(outData.data()), static_cast<std::streamsize>(dataSize));
	            if (!out) { err = "failed to write wav data"; return false; }
	            return true;
	        };

	        auto run_argv = [&](const std::vector<std::string>& args) -> int {
	            if (args.empty() || args[0].empty()) return 127;
	            std::vector<std::string> owned = args;
	            std::vector<char*> argv;
	            argv.reserve(owned.size() + 1);
	            for (auto& s : owned) argv.push_back(s.data());
	            argv.push_back(nullptr);

	            pid_t pid = fork();
	            if (pid < 0) return -1;
	            if (pid == 0)
	            {
	                execvp(argv[0], argv.data());
	                _exit(127);
	            }
	            int status = 0;
	            if (waitpid(pid, &status, 0) < 0) return -1;
	            if (WIFEXITED(status)) return WEXITSTATUS(status);
	            if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
	            return -1;
	        };

	        auto normalize_wav_for_sip = [&](const std::string& inPath, const std::string& outPath, std::string& err) -> bool {
	            // Best-effort normalization to a consistent format so we can concatenate reliably.
	            // Target format: 48kHz mono PCM 16-bit (keeps quality high for internal calls).
	            //
	            // If the input is already compatible and PCM, avoid any external dependency.
	            uint16_t ch = 0;
	            uint32_t sr = 0;
	            uint16_t bps = 0;
	            size_t off = 0, sz = 0;
	            std::string perr;
	            if (parse_wav_pcm(inPath, ch, sr, bps, off, sz, perr))
	            {
	                if (ch == 1 && sr == 48000 && bps == 16)
	                {
	                    // Already in target format: just copy into the staging path.
	                    std::string copyErr;
	                    if (!copy_file_best_effort(inPath, outPath, copyErr))
	                    {
	                        err = "failed to stage wav: " + (copyErr.empty() ? inPath : copyErr);
	                        return false;
	                    }
	                    return true;
	                }
	            }

	            // Otherwise, use sox when available. This is optional; if not present, we return
	            // a clear error so users can re-export wavs in a consistent format.
	            const std::string soxPath = "/usr/bin/sox";
	            if (!command_exists(soxPath))
	            {
	                err = "wav formats differ and need normalization, but sox is not installed. "
	                      "Either install sox (installer `--deps`) or re-export audio as PCM 16-bit mono 48kHz: " + inPath;
	                return false;
	            }
	            // sox <in> -r 48000 -c 1 -b 16 -e signed-integer <out>
	            const int rc = run_argv({soxPath, inPath, "-r", "48000", "-c", "1", "-b", "16", "-e", "signed-integer", outPath});
	            if (rc != 0)
	            {
	                err = "sox normalize failed (exit_code=" + std::to_string(rc) + "): " + inPath;
	                return false;
	            }
	            return true;
	        };

	        auto stage_sip_wav_sequence = [&](const std::vector<std::string>& paths, int gapMs, const std::string& outPath, std::string& err) -> bool {
	            // Fast path: concat directly if all WAV formats match.
	            if (concat_pcm_wavs(paths, gapMs, outPath, err)) return true;

	            // Slow path: normalize each file to a consistent WAV format, then concat.
	            std::vector<std::string> normalized;
	            normalized.reserve(paths.size());
	            for (size_t i = 0; i < paths.size(); ++i)
	            {
	                const std::string p = paths[i];
	                if (p.empty()) continue;
	                const std::string norm = (tmpdir / ("sip-norm-" + std::to_string(i) + ".wav")).string();
	                std::string nerr;
	                if (!normalize_wav_for_sip(p, norm, nerr))
	                {
	                    err = nerr.empty() ? ("failed to normalize: " + p) : nerr;
	                    return false;
	                }
	                normalized.push_back(norm);
	            }
	            if (normalized.empty()) { err = "no normalizable audio paths"; return false; }
	            std::string concatErr;
	            if (!concat_pcm_wavs(normalized, gapMs, outPath, concatErr))
	            {
	                err = concatErr.empty() ? "concat failed after normalize" : concatErr;
	                return false;
	            }
	            return true;
	        };

		        // Stage a single wav to play.
		        std::vector<std::string> playSeq;
		        playSeq.reserve(job.alarm.audio_paths.size() + 3);
		        if (!job.alarm.audio_paths.empty())
		        {
		            playSeq.insert(playSeq.end(), job.alarm.audio_paths.begin(), job.alarm.audio_paths.end());
		        }
		        else
		        {
		            const std::string tts = !job.alarm.speech_text.empty()
		                ? job.alarm.speech_text
		                : (!job.alarm.speech_texts.empty() ? job.alarm.speech_texts[0] : "");
		            if (std::any_of(tts.begin(), tts.end(), [](unsigned char c) { return !std::isspace(c); }))
		            {
		                std::string ttsPath;
		                std::string err;
		                if (!generate_tts_wav_public(tts, ttsPath, err))
		                {
		                    result = err.empty() ? "sip tts failed" : err;
		                    std::filesystem::remove_all(tmpdir, ec);
		                    return false;
		                }
		                const std::string staged = (tmpdir / "sip-tts.wav").string();
		                std::string copyErr;
		                if (!copy_file_best_effort(ttsPath, staged, copyErr))
		                {
		                    result = "sip tts stage failed: " + (copyErr.empty() ? "copy failed" : copyErr);
		                    std::filesystem::remove_all(tmpdir, ec);
		                    return false;
		                }
		                playSeq.push_back(staged);
		            }
		        }

		        if (ack_required && sip.ack_prompt_tts)
		        {
		            const std::string prompt = ack_prompt_text();
		            if (!prompt.empty())
		            {
		                std::string promptPath;
		                std::string err;
		                if (generate_tts_wav_public(prompt, promptPath, err) && !promptPath.empty())
		                {
		                    const std::string staged = (tmpdir / "sip-ack-prompt.wav").string();
		                    std::string copyErr;
		                    if (copy_file_best_effort(promptPath, staged, copyErr))
		                    {
		                        playSeq.push_back(staged);
		                    }
		                }
		            }
		        }

		        const int sipAudioDelaySeconds = std::max(0, std::min(120, job.audio_delay_seconds));
		        if (!playSeq.empty() && sipAudioDelaySeconds > 0)
		        {
		            std::string err;
		            const std::string silencePath = (tmpdir / "sip-playback-delay.wav").string();
		            if (!write_silence_wav_48k_mono16(silencePath, sipAudioDelaySeconds * 1000, err))
		            {
		                result = "sip playback delay stage failed: " + (err.empty() ? "unknown error" : err);
		                std::filesystem::remove_all(tmpdir, ec);
		                return false;
		            }
		            playSeq.insert(playSeq.begin(), silencePath);
		        }

		        std::string wav_path;
		        if (!playSeq.empty())
		        {
		            const int gapMs = std::max(0, std::min(5000, job.audio_gap_ms));
		            const std::string outPath = (tmpdir / "sip-audio.wav").string();
		            std::string err;
		            if (!stage_sip_wav_sequence(playSeq, gapMs, outPath, err))
		            {
		                result = "sip wav stage failed: " + (err.empty() ? "unknown error" : err);
		                std::filesystem::remove_all(tmpdir, ec);
		                return false;
		            }
		            wav_path = outPath;
		        }

		        PjsuaRunResult rr;
		        bool used_pjsua2 = false;
#if defined(OPCBRIDGE_HAVE_PJSUA2)
		        // PJSUA2 is optional; prefer external `pjsua` by default since PJSUA2 runs
		        // in-process and any library crash would take down opcbridge-alarms.
		        if (sip.use_pjsua2)
		        {
		            used_pjsua2 = true;
		            std::string ack_confirm_wav_path;
		            int ack_confirm_max_ms = 0;
		            // Keepalive: continuously transmit silence so the call doesn't get dropped when the message audio ends.
		            std::string keepalive_silence_wav_path;
		            {
		                std::string serr;
		                const std::string silencePath = (tmpdir / "sip-silence.wav").string();
		                if (write_silence_wav_48k_mono16(silencePath, 1000, serr))
		                {
		                    keepalive_silence_wav_path = silencePath;
		                }
		                else
		                {
		                    // Not fatal; call may end early on some PBXs if we can't keep RTP flowing.
		                    std::cout << "[alarms][sip] warn: failed to create silence keepalive wav: " << serr << "\n";
		                }
		            }
		            // If ACK is required, optionally play a short confirmation after ACK.
		            if (!job.ack_dtmf.empty() && job.ack_wait_sec > 0)
		            {
		                ack_confirm_max_ms = std::max(0, sip.ack_confirm_max_ms);
		                if (!sip.ack_confirm_audio_file.empty())
		                {
		                    ack_confirm_wav_path = audio_path_for_id_copy(sip.ack_confirm_audio_file);
		                }
		                else if (std::any_of(sip.ack_confirm_tts_text.begin(), sip.ack_confirm_tts_text.end(),
		                                     [](unsigned char c) { return !std::isspace(c); }))
		                {
		                    std::string ttsPath;
		                    std::string ttsErr;
		                    if (generate_tts_wav_public(sip.ack_confirm_tts_text, ttsPath, ttsErr) && !ttsPath.empty())
		                    {
		                        const std::string staged = (tmpdir / "sip-ack-confirm.wav").string();
		                        std::string copyErr;
		                        if (copy_file_best_effort(ttsPath, staged, copyErr))
		                        {
		                            ack_confirm_wav_path = staged;
		                        }
		                    }
		                }
		                // If the resolved path is relative (e.g. config value), resolve it against configDir.
		                if (!ack_confirm_wav_path.empty())
		                {
		                    ack_confirm_wav_path = resolve_audio_path(config_dir_, ack_confirm_wav_path);
		                }
		            }
		            pjsua2_run_call_with_file(
		                host,
		                port,
		                sip.ext,
		                sip.pass,
		                sip.transport,
		                netIf,
		                dest,
		                wav_path,
		                ack_confirm_wav_path,
		                keepalive_silence_wav_path,
		                ack_confirm_max_ms,
		                std::min(600, duration + sipAudioDelaySeconds),
		                ringTimeoutSec,
		                job.ack_wait_sec,
		                job.ack_dtmf,
		                rr
		            );
		        }
#endif

	        const std::string pjsuaPath = "/opt/opcbridge-suite/bin/pjsua";
	        if ((!used_pjsua2 || rr.exit_code != 0 || (!wav_path.empty() && !rr.file_connected_to_call)) && command_exists(pjsuaPath))
	        {
	            if (used_pjsua2 && (rr.exit_code != 0 || (!wav_path.empty() && !rr.file_connected_to_call)))
	            {
	                std::cout << "[alarms][sip] PJSUA2 call attempt failed; falling back to pjsua CLI\n";
	            }
	            used_pjsua2 = false;
	            pjsua_run_call_with_file(
	                pjsuaPath,
	                host,
	                port,
	                sip.ext,
	                sip.pass,
	                sip.transport,
	                netIf,
	                dest,
	                wav_path,
	                std::min(600, duration + sipAudioDelaySeconds),
	                ringTimeoutSec,
	                job.ack_wait_sec,
	                job.ack_dtmf,
	                rr
	            );
	        }

	        if (!used_pjsua2 && rr.exit_code < 0 && !command_exists(pjsuaPath))
	        {
	            result = "No SIP dialer available. Install pjproject (--deps or --with-pjsip).";
	            std::filesystem::remove_all(tmpdir, ec);
	            return false;
	        }

	        bool fatal = false;
	        for (const int c : rr.invite_codes)
	        {
	            if (c == 401 || c == 407) continue;
	            if (c >= 400) fatal = true;
	        }
	        // For policy calls:
	        // - ok means we successfully attempted a call (INVITE succeeded and no fatal errors),
	        //   not that the alarm was acknowledged.
	        // - Acknowledgement is handled separately via DTMF (when enabled).
	        const bool ok = rr.invite_answered && !fatal;

	        // Store a short SIP debug tail for troubleshooting DTMF/ack issues.
	        {
	            const std::string& full = rr.log;
	            const size_t keep = std::min<size_t>(4000, full.size());
	            std::string tail = keep ? full.substr(full.size() - keep) : full;
	            // Strip ANSI color codes (best-effort) to keep JSON readable.
	            {
	                std::string cleaned;
	                cleaned.reserve(tail.size());
	                for (size_t i = 0; i < tail.size(); ++i)
	                {
	                    const unsigned char c = static_cast<unsigned char>(tail[i]);
	                    if (c == 0x1B) // ESC
	                    {
	                        if ((i + 1) < tail.size() && tail[i + 1] == '[')
	                        {
	                            i += 2;
	                            while (i < tail.size())
	                            {
	                                const unsigned char cc = static_cast<unsigned char>(tail[i]);
	                                if ((cc >= 'A' && cc <= 'Z') || (cc >= 'a' && cc <= 'z')) break;
	                                ++i;
	                            }
	                            continue;
	                        }
	                        continue;
	                    }
	                    cleaned.push_back(static_cast<char>(c));
	                }
	                tail.swap(cleaned);
	            }
	            std::string markers;
	            {
	                std::string lower;
	                lower.reserve(tail.size());
	                for (char ch : tail) lower.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(ch))));
	                if (lower.find("dtmf") != std::string::npos) markers += "dtmf ";
	                if (lower.find("signal=") != std::string::npos) markers += "signal= ";
	                if (lower.find("info") != std::string::npos) markers += "info ";
	            }
	            std::lock_guard<std::mutex> lock(mu_);
	            last_sip_debug_ts_ms_ = now_ms();
	            last_sip_debug_dtmf_markers_ = trim_tts_text(markers);
	            last_sip_debug_tail_ = tail;
	        }

	        if (!rr.acked_dtmf.empty())
	        {
	            // Acknowledge the alarm immediately.
	            std::function<bool(const std::string&, const std::string&, const std::string&)> fn;
	            {
	                std::lock_guard<std::mutex> lock(mu_);
	                fn = ack_alarm_;
	                last_phone_ack_ts_ms_ = now_ms();
	                last_phone_ack_alarm_id_ = job.alarm.alarm_id;
	                last_phone_ack_policy_id_ = job.policy_id;
	                last_phone_ack_contact_id_ = job.contact_id;
	                last_phone_ack_dtmf_ = rr.acked_dtmf;
	            }
	            if (fn)
	            {
	                const std::string note = "dtmf=" + rr.acked_dtmf + " policy=" + job.policy_id + " contact=" + job.contact_id;
	                fn(job.alarm.alarm_id, "phone_policy", note);
	            }
	        }
		        result = "exit_code=" + std::to_string(rr.exit_code) +
		            " alarm_id=" + job.alarm.alarm_id +
		            " policy_id=" + job.policy_id +
		            " contact_id=" + job.contact_id +
		            " phone=" + job.phone +
		            " net_if=" + netIf +
		            " dest=" + dest +
		            " duration=" + std::to_string(duration) +
		            " ring_timeout_sec=" + std::to_string(ringTimeoutSec) +
		            " ack_keys=" + [&]() -> std::string {
		                std::string out;
		                for (size_t i = 0; i < job.ack_dtmf.size(); ++i)
		                {
		                    const std::string k = job.ack_dtmf[i];
		                    if (k.empty()) continue;
		                    if (!out.empty()) out.push_back(',');
		                    out.push_back(k[0]);
		                }
		                return out;
		            }() +
		            " ack_wait_sec=" + std::to_string(job.ack_wait_sec) +
		            " elapsed_ms=" + std::to_string(rr.elapsed_ms) +
		            " answered_offset_ms=" + std::to_string(rr.answered_offset_ms) +
		            " file_port=" + std::to_string(rr.file_port) +
		            " call_port=" + std::to_string(rr.call_port);
	        if (!rr.stop_reason.empty()) result += " stop_reason=" + rr.stop_reason;
	        if (!rr.acked_dtmf.empty()) result += " acked_dtmf=" + rr.acked_dtmf;
	        if (!rr.invite_codes.empty())
	        {
	            result += " invite_codes=";
	            for (size_t i = 0; i < rr.invite_codes.size(); ++i)
	            {
	                if (i) result += ",";
	                result += std::to_string(rr.invite_codes[i]);
	            }
	        }

	        std::filesystem::remove_all(tmpdir, ec);
	        return ok;
	    }

	    bool run_call(const Job& job, std::string& result)
	    {
	        // Prefer SIP when configured/enabled; fall back to voice modem.
	        // Policy/job do not contain backend-specific parameters.
	        SipConfig sip;
	        VoiceModemConfig vm;
	        {
	            std::lock_guard<std::mutex> lock(mu_);
	            sip = sip_;
	            vm = voice_modem_;
	        }

            const bool sipConfigured = !sip.server.empty() && !sip.ext.empty() && !sip.pass.empty();
            const bool vmConfigured = !vm.device.empty();
	        const bool sipReadyAuto = sip.enabled && sipConfigured;
	        const bool vmReadyAuto = vm.enabled && vmConfigured;

	        const std::string backend = job.call_backend.empty() ? "auto" : job.call_backend;
	        if (backend == "sip")
	        {
	            if (!sipConfigured)
	            {
	                result = "call_backend=sip but SIP is not configured";
	                return false;
	            }
	            return run_sip_call(job, result);
	        }
	        if (backend == "voice_modem")
	        {
	            if (!vmConfigured)
	            {
	                result = "call_backend=voice_modem but voice modem is not configured";
	                return false;
	            }
	            return run_voice_modem_call(job, result);
	        }

	        // auto
	        if (sipReadyAuto)
	        {
	            return run_sip_call(job, result);
	        }
	        if (vmReadyAuto)
	        {
	            return run_voice_modem_call(job, result);
	        }
	        result = "no call backend configured (enable SIP or Voice Modem)";
	        return false;
	    }

	    bool run_call_sequence(const Job& job, std::string& result)
	    {
	        // Call policy targets in-order until the alarm is acknowledged/returned (per `until`)
	        // or until we run out of targets. If acknowledgement is configured, a call only
	        // "stops the sequence" when DTMF acknowledgement is received.
	        if (job.call_legs.empty())
	        {
	            result = "no call targets";
	            return false;
	        }

	        const int64_t start_ms = now_ms();
	        bool got_ack = false;
	        bool any_answer = false;
	        std::string last_leg_result;
	        const bool ack_required = !job.ack_dtmf.empty() && job.ack_wait_sec > 0;

	        for (size_t i = 0; i < job.call_legs.size(); ++i)
	        {
	            if (job.event_type == "active" && !should_continue_job(job))
	            {
	                result = "stopped: alarm no longer requires notification";
	                return got_ack;
	            }

	            const auto& leg = job.call_legs[i];
	            log_escalation("dial", job,
	                           "leg=" + std::to_string(i + 1) + "/" + std::to_string(job.call_legs.size()),
	                           leg.contact_id, leg.contact_name, leg.phone);
	            const int64_t desired_ms = start_ms + std::max<int64_t>(0, leg.after_ms);
	            const int64_t delay_ms = desired_ms - now_ms();
	            if (delay_ms > 0)
	            {
	                std::this_thread::sleep_for(std::chrono::milliseconds(delay_ms));
	            }

	            Job legJob = job;
	            legJob.route.type = "call";
	            legJob.phone = leg.phone;
	            legJob.contact_id = leg.contact_id;
	            legJob.contact_name = leg.contact_name;
	            legJob.audio_delay_seconds = leg.audio_delay_seconds >= 0 ? leg.audio_delay_seconds : job.audio_delay_seconds;
	            legJob.call_legs.clear();

	            // Track ack state before this call.
	            int64_t ack_ts_before = 0;
	            std::string ack_alarm_before;
	            std::string ack_policy_before;
	            std::string ack_contact_before;
	            {
	                std::lock_guard<std::mutex> lock(mu_);
	                ack_ts_before = last_phone_ack_ts_ms_;
	                ack_alarm_before = last_phone_ack_alarm_id_;
	                ack_policy_before = last_phone_ack_policy_id_;
	                ack_contact_before = last_phone_ack_contact_id_;
	            }

	            std::string legRes;
	            const bool ok = run_call(legJob, legRes);
	            last_leg_result = legRes;
	            log_escalation(ok ? "call_ok" : "call_failed", job,
	                           "leg=" + std::to_string(i + 1) + "/" + std::to_string(job.call_legs.size()) +
	                               (legRes.empty() ? "" : (" " + legRes)),
	                           leg.contact_id, leg.contact_name, leg.phone);

	            // Determine whether this leg produced a new acknowledgement for this alarm+policy.
	            {
	                std::lock_guard<std::mutex> lock(mu_);
	                if (last_phone_ack_ts_ms_ > ack_ts_before &&
	                    last_phone_ack_alarm_id_ == job.alarm.alarm_id &&
	                    last_phone_ack_policy_id_ == job.policy_id)
	                {
	                    got_ack = true;
	                }
	            }

	            if (ok) any_answer = true;
	            if (!ack_required && ok)
	            {
	                // No acknowledgement required: stop after the first answered call.
	                log_escalation("sequence_stop", job, "reason=answered_no_ack_required",
	                               leg.contact_id, leg.contact_name, leg.phone);
	                result = "answered_by=" + leg.contact_id + " phone=" + leg.phone + " result=" + legRes;
	                return true;
	            }
	            if (got_ack)
	            {
	                log_escalation("sequence_stop", job, "reason=acked",
	                               leg.contact_id, leg.contact_name, leg.phone);
	                result = "acked_by=" + leg.contact_id + " phone=" + leg.phone + " result=" + legRes;
	                return true;
	            }
	        }

	        log_escalation("sequence_complete", job, "attempted=" + std::to_string(job.call_legs.size()));
	        result = "sequence_complete attempted=" + std::to_string(job.call_legs.size());
	        if (!last_leg_result.empty()) result += " last_result=" + last_leg_result;
	        // If no ack is configured, treat "any answered" as success. Otherwise, require ack.
	        if (!ack_required) return any_answer;
	        return false;
	    }

    static bool modem_response_ok(const std::string& response)
    {
        return response.find("OK") != std::string::npos ||
               response.find("CONNECT") != std::string::npos ||
               response.find("VCON") != std::string::npos;
    }

    static bool modem_response_error(const std::string& response)
    {
        return response.find("ERROR") != std::string::npos ||
               response.find("NO CARRIER") != std::string::npos ||
               response.find("NO DIALTONE") != std::string::npos ||
               response.find("BUSY") != std::string::npos;
    }

    static bool send_modem_command(ModemSerialPort& port, const std::string& command, int timeout_ms, std::string& response, std::string& err)
    {
        if (!port.write_all(command + "\r", err)) return false;
        response = port.read_for(timeout_ms);
        if (response.empty()) {
            err = "no modem response";
            return false;
        }
        if (modem_response_error(response)) {
            err = response;
            return false;
        }
        return modem_response_ok(response);
    }

    static uint16_t read_le16(const std::vector<uint8_t>& data, size_t off)
    {
        if (off + 2 > data.size()) return 0;
        return static_cast<uint16_t>(data[off]) | (static_cast<uint16_t>(data[off + 1]) << 8);
    }

    static uint32_t read_le32(const std::vector<uint8_t>& data, size_t off)
    {
        if (off + 4 > data.size()) return 0;
        return static_cast<uint32_t>(data[off]) |
               (static_cast<uint32_t>(data[off + 1]) << 8) |
               (static_cast<uint32_t>(data[off + 2]) << 16) |
               (static_cast<uint32_t>(data[off + 3]) << 24);
    }

    static bool load_wav_for_modem(const std::string& path, std::string& pcm, std::string& err)
    {
        std::ifstream in(path, std::ios::binary);
        if (!in) {
            err = "failed to open WAV file: " + path + " (" + std::strerror(errno) + ")";
            return false;
        }
        std::vector<uint8_t> data((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
        if (data.size() < 44 || std::string(reinterpret_cast<const char*>(data.data()), 4) != "RIFF" ||
            std::string(reinterpret_cast<const char*>(data.data() + 8), 4) != "WAVE") {
            err = "not a RIFF/WAVE file: " + path;
            return false;
        }

        uint16_t audioFormat = 0;
        uint16_t channels = 0;
        uint32_t sampleRate = 0;
        uint16_t bitsPerSample = 0;
        size_t audioOff = 0;
        size_t audioSize = 0;

        size_t pos = 12;
        while (pos + 8 <= data.size()) {
            const std::string id(reinterpret_cast<const char*>(data.data() + pos), 4);
            const uint32_t size = read_le32(data, pos + 4);
            const size_t chunkData = pos + 8;
            if (chunkData + size > data.size()) break;

            if (id == "fmt ") {
                if (size < 16) {
                    err = "invalid WAV fmt chunk";
                    return false;
                }
                audioFormat = read_le16(data, chunkData);
                channels = read_le16(data, chunkData + 2);
                sampleRate = read_le32(data, chunkData + 4);
                bitsPerSample = read_le16(data, chunkData + 14);
            } else if (id == "data") {
                audioOff = chunkData;
                audioSize = size;
            }

            pos = chunkData + size + (size % 2);
        }

        if (audioFormat != 1) {
            err = "only PCM WAV files are supported";
            return false;
        }
        if (channels < 1 || channels > 2) {
            err = "only mono/stereo WAV files are supported";
            return false;
        }
        if (bitsPerSample != 8 && bitsPerSample != 16) {
            err = "voice modem playback requires 8-bit or 16-bit PCM WAV audio";
            return false;
        }
        if (!audioOff || !audioSize) {
            err = "WAV data chunk not found";
            return false;
        }

        const size_t frameBytes = static_cast<size_t>(channels) * (bitsPerSample / 8);
        const size_t frames = audioSize / frameBytes;
        if (!frames || !sampleRate) {
            err = "WAV file contains no playable samples";
            return false;
        }

        std::vector<int32_t> mono;
        mono.reserve(frames);
        if (bitsPerSample == 8) {
            for (size_t i = 0; i < frames; ++i) {
                int32_t sum = 0;
                for (uint16_t ch = 0; ch < channels; ++ch) {
                    const uint8_t sample = data[audioOff + (i * frameBytes) + ch];
                    sum += (static_cast<int32_t>(sample) - 128) << 8;
                }
                mono.push_back(sum / static_cast<int32_t>(channels));
            }
        } else {
            for (size_t i = 0; i < frames; ++i) {
                int32_t sum = 0;
                for (uint16_t ch = 0; ch < channels; ++ch) {
                    const size_t off = audioOff + (i * frameBytes) + (static_cast<size_t>(ch) * 2);
                    const int16_t sample = static_cast<int16_t>(read_le16(data, off));
                    sum += sample;
                }
                mono.push_back(sum / static_cast<int32_t>(channels));
            }
        }

        if (mono.empty()) {
            err = "WAV file contains no playable samples";
            return false;
        }

        const uint32_t targetRate = 8000;
        const size_t outFrames = std::max<size_t>(1, static_cast<size_t>((static_cast<uint64_t>(mono.size()) * targetRate) / sampleRate));
        pcm.clear();
        pcm.reserve(outFrames);
        for (size_t outIdx = 0; outIdx < outFrames; ++outIdx) {
            const double srcPos = static_cast<double>(outIdx) * static_cast<double>(sampleRate) / static_cast<double>(targetRate);
            const size_t i0 = std::min(static_cast<size_t>(srcPos), mono.size() - 1);
            const size_t i1 = std::min(i0 + 1, mono.size() - 1);
            const double frac = srcPos - static_cast<double>(i0);
            const double sample = static_cast<double>(mono[i0]) + (static_cast<double>(mono[i1] - mono[i0]) * frac);
            const int32_t clamped = std::max<int32_t>(-32768, std::min<int32_t>(32767, static_cast<int32_t>(sample)));
            const uint8_t u8 = static_cast<uint8_t>((clamped + 32768) >> 8);
            pcm.push_back(static_cast<char>(u8));
        }
        return true;
    }

    static std::string dle_escape_voice_data(const std::string& pcm)
    {
        std::string out;
        out.reserve(pcm.size() + 16);
        for (unsigned char ch : pcm) {
            out.push_back(static_cast<char>(ch));
            if (ch == 0x10) out.push_back(static_cast<char>(0x10));
        }
        out.push_back(static_cast<char>(0x10));
        out.push_back(static_cast<char>(0x03));
        return out;
    }

    static bool play_wav_over_modem(ModemSerialPort& port, const std::string& path, int voice_line, int timeout_ms, int post_playback_drain_ms, std::string& result)
    {
        std::string pcm;
        std::string err;
        if (!load_wav_for_modem(path, pcm, err)) {
            result = err;
            return false;
        }

        std::string response;
        // Select normal telephone-line voice path before entering transmit mode.
        send_modem_command(port, "AT+VLS=" + std::to_string(voice_line), timeout_ms, response, err);

        if (!send_modem_command(port, "AT+VSM=1", timeout_ms, response, err)) {
            result = "AT+VSM=1 failed: " + err;
            return false;
        }
        if (!send_modem_command(port, "AT+VTX", timeout_ms, response, err)) {
            result = "AT+VTX failed: " + err;
            return false;
        }
        if (response.find("CONNECT") == std::string::npos) {
            result = "AT+VTX did not enter transmit mode";
            return false;
        }

        const std::string payload = dle_escape_voice_data(pcm);
        if (!port.write_all(payload, err)) {
            result = "voice audio write failed: " + err;
            return false;
        }
        if (post_playback_drain_ms > 0) port.read_for(post_playback_drain_ms);
        result = "played " + std::to_string(pcm.size()) + " samples from " + path;
        return true;
    }

    static bool play_wavs_over_modem(ModemSerialPort& port, const std::vector<std::string>& paths, int voice_line, int timeout_ms, int gap_ms, std::string& result, int& played_count)
    {
        std::string combined;
        std::string err;
        played_count = 0;

        const int clean_gap_ms = std::max(0, std::min(5000, gap_ms));
        const size_t gap_samples = static_cast<size_t>((8000LL * clean_gap_ms) / 1000LL);
        const std::string silence(gap_samples, static_cast<char>(0x80));

        for (const auto& path : paths) {
            if (path.empty()) continue;
            std::string pcm;
            if (!load_wav_for_modem(path, pcm, err)) {
                result = err;
                return false;
            }
            if (!combined.empty() && !silence.empty()) combined.append(silence);
            combined.append(pcm);
            played_count++;
        }

        if (combined.empty() || played_count <= 0) {
            result = "no playable WAV files";
            return false;
        }

        std::string response;
        // Keep the modem in one transmit session. Re-entering AT+VTX per file can
        // add several seconds of modem-controlled silence between short messages.
        send_modem_command(port, "AT+VLS=" + std::to_string(voice_line), timeout_ms, response, err);

        if (!send_modem_command(port, "AT+VSM=1", timeout_ms, response, err)) {
            result = "AT+VSM=1 failed: " + err;
            return false;
        }
        if (!send_modem_command(port, "AT+VTX", timeout_ms, response, err)) {
            result = "AT+VTX failed: " + err;
            return false;
        }
        if (response.find("CONNECT") == std::string::npos) {
            result = "AT+VTX did not enter transmit mode";
            return false;
        }

        const std::string payload = dle_escape_voice_data(combined);
        if (!port.write_all(payload, err)) {
            result = "voice audio write failed: " + err;
            return false;
        }
        if (clean_gap_ms > 0) port.read_for(clean_gap_ms);
        result = "played " + std::to_string(combined.size()) + " samples from " + std::to_string(played_count) + " file(s)";
        return true;
    }

    bool run_voice_modem_call(const Job& job, std::string& result)
    {
        VoiceModemConfig vm;
        {
            std::lock_guard<std::mutex> lock(mu_);
            vm = voice_modem_;
        }

        if (!vm.enabled) {
            result = "voice modem disabled";
            return false;
        }
        if (vm.device.empty()) {
            result = "voice modem device not configured";
            return false;
        }

        const std::string number = sanitize_phone_number(job.phone);
        if (number.empty()) {
            result = "contact has no dialable phone number";
            return false;
        }

        auto detect_ack_digit = [&](const std::string& input, std::string& outKey) -> bool {
            auto allowed = [&](char ch) -> bool {
                for (const auto& key : job.ack_dtmf)
                {
                    if (key.size() == 1 && key[0] == ch) return true;
                }
                return false;
            };
            for (char ch : input)
            {
                if (allowed(ch))
                {
                    outKey.assign(1, ch);
                    return true;
                }
            }
            return false;
        };
        auto acknowledge_alarm_from_phone = [&](const std::string& key) -> bool {
            std::function<bool(const std::string&, const std::string&, const std::string&)> fn;
            {
                std::lock_guard<std::mutex> lock(mu_);
                fn = ack_alarm_;
                last_phone_ack_ts_ms_ = now_ms();
                last_phone_ack_alarm_id_ = job.alarm.alarm_id;
                last_phone_ack_policy_id_ = job.policy_id;
                last_phone_ack_contact_id_ = job.contact_id;
                last_phone_ack_dtmf_ = key;
            }
            if (!fn) return false;
            const std::string note = "dtmf=" + key + " policy=" + job.policy_id + " contact=" + job.contact_id;
            return fn(job.alarm.alarm_id, "phone_policy", note);
        };

        ModemSerialPort port;
        std::string err;
        if (!port.open_port(vm.device, vm.baud, err)) {
            result = "open " + vm.device + " failed: " + err;
            return false;
        }

        std::string response;
        if (!send_modem_command(port, "AT", vm.command_timeout_ms, response, err)) {
            result = "AT failed: " + err;
            return false;
        }

        // Disable echo when supported. A failure here should not block dialing.
        send_modem_command(port, "ATE0", vm.command_timeout_ms, response, err);

        const std::vector<std::string> playbackPaths = !job.alarm.audio_paths.empty()
            ? job.alarm.audio_paths
            : (job.alarm.audio_path.empty() ? std::vector<std::string>{} : std::vector<std::string>{job.alarm.audio_path});
        const bool needsAudioPlayback = !playbackPaths.empty();
        if ((vm.voice_init || needsAudioPlayback) && !send_modem_command(port, "AT+FCLASS=8", vm.command_timeout_ms, response, err)) {
            result = "voice init failed: " + err;
            return false;
        }
        const int voiceLine = std::max(0, std::min(255, vm.voice_line));
        if (needsAudioPlayback && !send_modem_command(port, "AT+VLS=" + std::to_string(voiceLine), vm.command_timeout_ms, response, err)) {
            result = "voice line select failed before dial: " + err;
            return false;
        }

        response.clear();
        err.clear();
        const std::string dialCommand = needsAudioPlayback ? ("ATD" + number) : ("ATD" + number + ";");
        if (!port.write_all(dialCommand + "\r", err)) {
            result = "dial write failed: " + err;
            return false;
        }
        response = port.read_for(vm.command_timeout_ms);
        if (modem_response_error(response)) {
            result = "dial failed: " + response;
            return false;
        }

        const int dialSeconds = std::max(1, std::min(300, vm.dial_seconds));
        const int audioDelaySeconds = std::max(0, std::min(120, job.audio_delay_seconds >= 0 ? job.audio_delay_seconds : vm.audio_delay_seconds));
        const int audioGapMs = std::max(0, std::min(5000, job.audio_gap_ms >= 0 ? job.audio_gap_ms : vm.audio_gap_ms));
        std::string playResult;
        int playedCount = 0;
        bool playFailed = false;
        const auto callStarted = std::chrono::steady_clock::now();
        if (needsAudioPlayback) {
            std::this_thread::sleep_for(std::chrono::seconds(audioDelaySeconds));
            // Drain any late dial/answer responses before requesting transmit mode.
            port.read_for(500);
            if (!play_wavs_over_modem(port, playbackPaths, voiceLine, vm.command_timeout_ms, audioGapMs, playResult, playedCount)) {
                playFailed = true;
            }
        }

        const auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() - callStarted).count();
        if (elapsed < dialSeconds) {
            std::this_thread::sleep_for(std::chrono::seconds(dialSeconds - elapsed));
        }

        const int ackWaitMs = std::max(0, std::min(120000, job.ack_wait_sec * 1000));
        if (ackWaitMs > 0)
        {
            const auto waitStart = std::chrono::steady_clock::now();
            std::string key;
            while (std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - waitStart).count() < ackWaitMs)
            {
                const std::string toneBuf = port.read_for(500);
                if (toneBuf.empty()) continue;
                if (detect_ack_digit(toneBuf, key) && acknowledge_alarm_from_phone(key))
                {
                    result = "called contact=" + job.contact_id + " name=" + job.contact_name + " acked_dtmf=" + key;
                    return true;
                }
            }
        }

        std::string hangupErr;
        std::string hangupResponse;
        send_modem_command(port, "ATH", vm.command_timeout_ms, hangupResponse, hangupErr);

        result = "called contact=" + job.contact_id + " name=" + job.contact_name + " seconds=" + std::to_string(dialSeconds);
        if (needsAudioPlayback) {
            result += !playFailed
                ? (" audio=played count=" + std::to_string(playedCount) + " files=" + audio_sequence_summary(job.alarm) + " delay=" + std::to_string(audioDelaySeconds) + " gap_ms=" + std::to_string(audioGapMs) + " vls=" + std::to_string(voiceLine))
                : " audio_failed=" + playResult + " files=" + audio_sequence_summary(job.alarm) + " gap_ms=" + std::to_string(audioGapMs) + " vls=" + std::to_string(voiceLine);
        }
        if (playFailed) return false;
        return true;
    }

    bool should_continue_job(const Job& job)
    {
        std::function<bool(const std::string&, const std::string&)> fn;
        {
            std::lock_guard<std::mutex> lock(mu_);
            fn = should_continue_;
        }
        if (!fn) return false;
        return fn(job.alarm.alarm_id, job.route.until);
    }

    void record_attempt(const Job& job, bool ok, const std::string& result)
    {
        AlarmDb* db = nullptr;
        {
            std::lock_guard<std::mutex> lock(mu_);
            attempts_++;
            if (ok) successes_++;
            else failures_++;
            last_attempt_ms_ = now_ms();
            last_route_type_ = job.route.type;
            last_route_name_ = job.route.name;
            last_result_ = result;
            db = db_;
        }
        if (!db) return;

        json attempt;
        attempt["attempt_id"] = "ntf_" + random_hex(16);
        attempt["ts_ms"] = now_ms();
        attempt["route_name"] = job.route.name;
        attempt["route_type"] = job.route.type;
        attempt["alarm_id"] = job.alarm.alarm_id;
        attempt["severity"] = job.alarm.severity;
        attempt["event_type"] = job.event_type;
        attempt["ok"] = ok;
        attempt["result"] = result;
        attempt["command"] = command_string(job);

        std::string err;
        if (!db->insert_notification_attempt(attempt, err))
        {
            std::cerr << "[alarms] notification attempt DB insert failed: " << err << "\n";
        }
    }

    std::deque<Job>& queue_for_locked(JobQueue queue)
    {
        return queue == JobQueue::Audio ? audio_jobs_ : modem_jobs_;
    }

    std::condition_variable& cv_for_locked(JobQueue queue)
    {
        return queue == JobQueue::Audio ? audio_cv_ : modem_cv_;
    }

    void worker_loop(JobQueue queue)
    {
        while (true)
        {
            Job job;
            {
                std::unique_lock<std::mutex> lock(mu_);
                auto& jobs = queue_for_locked(queue);
                auto& cv = cv_for_locked(queue);
                cv.wait(lock, [&]() { return stop_ || !jobs.empty(); });
                if (stop_) return;

                auto best = jobs.begin();
                for (auto it = jobs.begin(); it != jobs.end(); ++it)
                {
                    if (it->due_ms < best->due_ms) best = it;
                }

                const int64_t delay = best->due_ms - now_ms();
                if (delay > 0)
                {
                    cv.wait_for(lock, std::chrono::milliseconds(delay));
                    continue;
                }

                job = std::move(*best);
                jobs.erase(best);
            }

            if (job.event_type == "active" && !should_continue_job(job)) continue;

            bool ok = false;
            std::string result;
            {
                std::lock_guard<std::mutex> lock(mu_);
                if (queue == JobQueue::Audio)
                {
                    active_audio_job_ = job.route.type + " alarm_id=" + job.alarm.alarm_id;
                }
                else
                {
                    std::string contactId = job.contact_id;
                    std::string phone = job.phone;
                    if (job.route.type == "call_sequence" && !job.call_legs.empty())
                    {
                        contactId = job.call_legs.front().contact_id;
                        phone = job.call_legs.front().phone;
                    }
                    active_modem_job_ = job.route.type + " alarm_id=" + job.alarm.alarm_id + " contact_id=" + contactId + " phone=" + phone;
                }
            }

	            if (queue == JobQueue::Modem)
	            {
	                if (job.route.type == "call_sequence")
	                {
	                    const std::string detail =
	                        "legs=" + std::to_string(job.call_legs.size()) +
	                        " repeat_ms=" + std::to_string(job.route.repeat_ms) +
	                        " repeats_left=" + std::to_string(job.repeats_left) +
	                        " event_type=" + job.event_type;
	                    if (!job.call_legs.empty())
	                    {
	                        log_escalation("start_sequence", job, detail,
	                                       job.call_legs.front().contact_id,
	                                       job.call_legs.front().contact_name,
	                                       job.call_legs.front().phone);
	                    }
	                    else
	                    {
	                        log_escalation("start_sequence", job, detail);
	                    }
	                }
	                else if (job.route.type == "call")
	                {
	                    log_escalation("start_call", job);
	                }
	            }
            if (job.route.type == "audio_command")
            {
                const int rc = run_audio_command_sequence(job);
                ok = (rc == 0);
                result = "exit_code=" + std::to_string(rc);
            }
	            else if (job.route.type == "voice_modem")
	            {
	                ok = run_voice_modem_call(job, result);
	            }
	            else if (job.route.type == "sip")
	            {
	                // Legacy route type (kept for backward compatibility with existing configs).
	                ok = run_sip_call(job, result);
	            }
	            else if (job.route.type == "email")
	            {
	                log_escalation("send_email", job, "to=" + job.email, job.contact_id, job.contact_name, job.email);
	                ok = run_email_job(job, result);
	            }
	            else if (job.route.type == "call_sequence")
	            {
	                ok = run_call_sequence(job, result);
	            }
	            else if (job.route.type == "call")
	            {
	                ok = run_call(job, result);
	            }
	            else
	            {
	                result = "unsupported route type";
            }
            record_attempt(job, ok, result);
            {
                std::lock_guard<std::mutex> lock(mu_);
                if (queue == JobQueue::Audio) active_audio_job_.clear();
                else active_modem_job_.clear();
            }

            if (job.event_type == "active" && job.route.repeat_ms > 0 && should_continue_job(job))
            {
                if (job.repeats_left == 0)
                {
                    // Max repeats reached.
                    log_escalation("repeat_stop", job, "reason=max_repeats_reached");
                    continue;
                }
                if (job.repeats_left > 0) job.repeats_left--;
                job.due_ms = now_ms() + job.route.repeat_ms;
                log_escalation("repeat_enqueue", job,
                               "due_in_ms=" + std::to_string(std::max<int64_t>(0, job.due_ms - now_ms())) +
                                   " repeat_ms=" + std::to_string(job.route.repeat_ms) +
                                   " repeats_left=" + std::to_string(job.repeats_left));
                std::lock_guard<std::mutex> lock(mu_);
                queue_for_locked(queue).push_back(std::move(job));
                cv_for_locked(queue).notify_all();
            }
            else if (job.event_type == "active" && job.route.repeat_ms > 0 && !should_continue_job(job))
            {
                log_escalation("repeat_skip", job, "reason=should_continue_false");
            }
        }
    }

	    mutable std::mutex mu_;
	    std::condition_variable audio_cv_;
	    std::condition_variable modem_cv_;
	    bool running_ = false;
	    bool stop_ = false;
	    std::vector<Route> routes_;
	    TtsConfig tts_;
	    SmtpConfig smtp_;
		    std::deque<Job> audio_jobs_;
		    std::deque<Job> modem_jobs_;
		    std::deque<EscalationLogEntry> escalation_log_;
		    VoiceModemConfig voice_modem_;
		    SipConfig sip_;
    std::unordered_map<std::string, Contact> contacts_;
    std::unordered_map<std::string, ContactGroup> contact_groups_;
    std::unordered_map<std::string, Policy> policies_;
    std::unordered_map<std::string, std::string> policy_name_to_id_;
    std::vector<Assignment> assignments_;
    std::vector<AlarmRouteBinding> alarm_route_bindings_;
    std::unordered_map<std::string, Schedule> schedules_;
    std::unordered_map<std::string, std::string> audio_paths_;
    AlarmDb* db_ = nullptr;
    std::function<bool(const std::string&, const std::string&)> should_continue_;
    std::function<bool(const std::string&, const std::string&, const std::string&)> ack_alarm_;
    std::string config_dir_;
    std::thread audio_worker_;
    std::thread modem_worker_;
    int64_t attempts_ = 0;
    int64_t successes_ = 0;
    int64_t failures_ = 0;
    int64_t schedule_skips_ = 0;
    int64_t last_schedule_skip_ts_ms_ = 0;
    std::string last_schedule_skip_scope_;
    std::string last_schedule_skip_name_;
    std::string last_schedule_skip_schedule_id_;
    std::string last_schedule_skip_event_type_;
    std::string last_schedule_skip_alarm_id_;
    int64_t last_policy_skip_ts_ms_ = 0;
    std::string last_policy_skip_scope_name_;
    std::string last_policy_skip_policy_id_;
    std::string last_policy_skip_event_type_;
    std::string last_policy_skip_alarm_id_;
    std::string last_policy_skip_reason_;
    int64_t last_phone_ack_ts_ms_ = 0;
    std::string last_phone_ack_alarm_id_;
    std::string last_phone_ack_policy_id_;
    std::string last_phone_ack_contact_id_;
    std::string last_phone_ack_dtmf_;
    int64_t last_sip_debug_ts_ms_ = 0;
    std::string last_sip_debug_dtmf_markers_;
    std::string last_sip_debug_tail_;
    int64_t last_attempt_ms_ = 0;
    std::string last_route_type_;
    std::string last_route_name_;
    std::string last_result_;
    std::string active_audio_job_;
    std::string active_modem_job_;
};

struct AlarmEngine;

struct AlarmUa
{
    std::atomic<bool> enabled{false};
    uint16_t port = 4841;

    bool start(uint16_t portIn, AlarmEngine* engineIn, std::string& err);
    void stop();

    void sync_alarms(const std::vector<AlarmState>& states);
    void upsert_alarm(const AlarmState& state);

private:
    struct AlarmNodes
    {
        UA_NodeId objectId{UA_NODEID_NULL};
        UA_NodeId id{UA_NODEID_NULL};
        UA_NodeId name{UA_NODEID_NULL};
        UA_NodeId message{UA_NODEID_NULL};
        UA_NodeId severity{UA_NODEID_NULL};
        UA_NodeId enabledVar{UA_NODEID_NULL};
        UA_NodeId active{UA_NODEID_NULL};
        UA_NodeId acked{UA_NODEID_NULL};
        UA_NodeId shelvedUntil{UA_NODEID_NULL};
        UA_NodeId activeSince{UA_NODEID_NULL};
        UA_NodeId lastChange{UA_NODEID_NULL};
        UA_NodeId connectionId{UA_NODEID_NULL};
        UA_NodeId tag{UA_NODEID_NULL};
        UA_NodeId lastValue{UA_NODEID_NULL};
    };

    enum class MethodAction { Ack, Shelve, Unshelve };

    struct MethodContext
    {
        AlarmUa* ua = nullptr;
        AlarmEngine* engine = nullptr;
        std::string alarm_id;
        MethodAction action{MethodAction::Ack};
    };

    std::mutex mu;
    std::condition_variable cv;
    bool stopFlag = false;
    std::vector<AlarmState> pending;

    AlarmEngine* engine = nullptr;
    UA_Server* server = nullptr;
    UA_UInt16 ns = 0;
    UA_NodeId alarmsFolderId{UA_NODEID_NULL};
    std::unordered_map<std::string, AlarmNodes> nodesById;
    std::vector<std::unique_ptr<MethodContext>> methodContexts;
    std::thread thread;

    static UA_StatusCode method_callback(UA_Server* server,
                                         const UA_NodeId* sessionId, void* sessionContext,
                                         const UA_NodeId* methodId, void* methodContext,
                                         const UA_NodeId* objectId, void* objectContext,
                                         size_t inputSize, const UA_Variant* input,
                                         size_t outputSize, UA_Variant* output);

    void ua_thread_main();
    void ensure_server_locked();
    void ensure_alarm_nodes_locked(const AlarmState& s);
    void write_alarm_locked(const AlarmState& s);
};

struct AlarmEngine
{
    mutable std::mutex mu;
    std::unordered_map<std::string, AlarmRule> rules;      // by alarm_id
    std::unordered_map<std::string, AlarmState> states;    // by alarm_id
    std::unordered_map<std::string, std::vector<std::string>> rulesByTagKey; // "conn:tag" -> alarm_ids
    int64_t global_delay_ms = 0;

    std::atomic<int64_t> last_tag_update_ms{0};
    std::atomic<int64_t> last_alarm_change_ms{0};
    // When opcbridge (re)connects, the first burst of tag updates may reflect
    // already-active conditions. Keep events suppressed until the HTTP seed has
    // completed successfully; the time window is only a secondary safety net.
    std::atomic<int64_t> suppress_events_until_ms{0};
    std::atomic<bool> opcbridge_baselining{true};
    std::atomic<bool> opcbridge_ws_connected{false};
    std::atomic<int64_t> opcbridge_ws_last_open_ms{0};
    std::atomic<int64_t> opcbridge_ws_last_close_ms{0};
    std::atomic<int64_t> opcbridge_ws_last_error_ms{0};
    std::atomic<int64_t> opcbridge_ws_last_message_ms{0};
    std::atomic<uint64_t> opcbridge_ws_open_count{0};
    std::atomic<uint64_t> opcbridge_ws_close_count{0};
    std::atomic<uint64_t> opcbridge_ws_error_count{0};
    mutable std::mutex config_meta_mu;
    std::string config_mode{"current"};
    bool config_downgraded = false;
    std::vector<std::string> config_notes;

    std::atomic<int64_t> last_config_mtime_ms{-1};
    mutable std::mutex config_hash_mu;
    std::string last_config_hash;
    AlarmDb* db = nullptr;
    AlarmWs* ws = nullptr;
    AlarmUa* ua = nullptr;
    NotificationManager* notifications = nullptr;

    void set_db(AlarmDb* ptr) { db = ptr; }
    void set_ws(AlarmWs* ptr) { ws = ptr; }
    void set_ua(AlarmUa* ptr) { ua = ptr; }
    void set_notifications(NotificationManager* ptr) { notifications = ptr; }

    bool should_record_events_now() const
    {
        if (opcbridge_baselining.load()) return false;
        return now_ms() >= suppress_events_until_ms.load();
    }
    void set_config_meta(std::string mode, bool downgraded, std::vector<std::string> notes)
    {
        std::lock_guard<std::mutex> lock(config_meta_mu);
        config_mode = std::move(mode);
        config_downgraded = downgraded;
        config_notes = std::move(notes);
    }
    json config_meta_json() const
    {
        std::lock_guard<std::mutex> lock(config_meta_mu);
        json notes = json::array();
        for (const auto& n : config_notes) notes.push_back(n);
        return {
            {"mode", config_mode},
            {"downgraded", config_downgraded},
            {"notes", notes}
        };
    }

    bool should_continue_notification(const std::string& alarm_id, const std::string& until) const
    {
        std::lock_guard<std::mutex> lock(mu);
        auto it = states.find(alarm_id);
        if (it == states.end()) return false;

        const AlarmState& s = it->second;
        const int64_t t = now_ms();
        const bool shelved = s.shelved_until_ms.has_value() && t < s.shelved_until_ms.value();
        if (!s.enabled || !s.site_enabled || shelved) return false;

        if (until == "returned") return s.active;
        if (until == "acked") return s.active && !s.acked;
        if (until == "manual") return s.active;
        return s.active && !s.acked;
    }

    void restore_state_from_db(int64_t since_ms)
    {
        if (!db) return;
        json events = json::array();
        std::string err;
        if (!db->fetch_events_since(since_ms, 50000, events, err))
        {
            std::cerr << "[alarms] DB restore skipped: " << err << "\n";
            return;
        }
        if (!events.is_array() || events.empty()) return;

        int64_t lastChange = last_alarm_change_ms.load();
        {
            std::lock_guard<std::mutex> lock(mu);
            for (const auto& ev : events)
            {
                if (!ev.is_object()) continue;
                const std::string alarmId = ev.value("alarm_id", "");
                const std::string type = ev.value("type", "");
                const int64_t ts = ev.value("ts_ms", 0LL);
                if (alarmId.empty() || type.empty() || ts <= 0) continue;

                auto it = states.find(alarmId);
                if (it == states.end()) continue;
                AlarmState& s = it->second;
                s.initialized = true;

                s.last_change_ms = ts;
                if (ts > lastChange) lastChange = ts;
                if (ev.contains("value")) s.last_value = ev["value"];
                if (ev.contains("message") && ev["message"].is_string()) s.message = ev["message"].get<std::string>();

                if (type == "active")
                {
                    s.active = true;
                    s.acked = false;
                    s.return_notification_armed = true;
                    s.active_since_ms = ts;
                }
                else if (type == "return" || type == "reset" || type == "clear")
                {
                    s.active = false;
                    s.return_notification_armed = false;
                    s.active_since_ms = 0;
                }
                else if (type == "ack")
                {
                    s.acked = true;
                }
                else if (type == "unack")
                {
                    s.acked = false;
                }
                else if (type == "shelve")
                {
                    int64_t until = 0;
                    if (ev.contains("value") && ev["value"].is_object())
                    {
                        until = ev["value"].value("until_ms", 0LL);
                    }
                    if (until > 0) s.shelved_until_ms = until;
                }
                else if (type == "unshelve")
                {
                    s.shelved_until_ms.reset();
                }
            }
        }

        last_alarm_change_ms.store(lastChange);

        if (ua)
        {
            std::vector<AlarmState> snap;
            {
                std::lock_guard<std::mutex> lock(mu);
                snap.reserve(states.size());
                for (const auto& kv : states) snap.push_back(kv.second);
            }
            ua->sync_alarms(snap);
        }
    }

	    void log_event(const AlarmState& s,
	                   const std::string& type,
	                   const json& value,
	                   const std::string& actor = "",
	                   const std::string& note = "")
	    {
	        json ev;
	        ev["event_id"] = "evt_" + random_hex(16);
        ev["ts_ms"] = now_ms();
        ev["alarm_id"] = s.alarm_id;
        ev["type"] = type;
        ev["severity"] = s.severity;
        ev["group"] = s.group;
        ev["site"] = s.site;
        ev["source"] = {{"connection_id", s.connection_id}, {"tag", s.tag}};
        ev["value"] = value;
        ev["message"] = s.message.empty() ? nullptr : json(s.message);
	        if (!actor.empty()) ev["actor"] = actor;
	        if (!note.empty()) ev["note"] = note;
	        if (db)
	        {
	            std::string err;
	            if (!db->insert_event(ev, err))
	            {
                std::cerr << "[alarms] DB insert failed: " << err << "\n";
            }
        }

        if (ws && ws->enabled.load())
        {
            json msg;
            msg["type"] = "alarm_event";
            msg["event"] = ev;
            ws->broadcast(msg);
        }
    }

    void load_rules_from_file(const std::string &path)
    {
        json root = json::parse(read_file(path));
        if (!root.is_object())
        {
            throw std::runtime_error("Invalid alarms.json; expected a JSON object.");
        }
        const json schema2 = root;
        const int64_t nextGlobalDelayMs = std::max<int64_t>(0, schema2.value("alarm_delay_ms", 0LL));

        std::string validationErr;
        if (!validate_supported_config(schema2, validationErr))
        {
            throw std::runtime_error("Unsupported alarms config: " + validationErr);
        }

        std::unordered_map<std::string, AlarmRule> nextRules;
        std::unordered_map<std::string, AlarmState> nextStates;
        std::unordered_map<std::string, std::vector<std::string>> nextByKey;

        json rulesArr = json::array();
        const bool hasRulesArr = schema2.contains("rules") && schema2["rules"].is_array();
        const bool hasAlarmsArr = schema2.contains("alarms") && schema2["alarms"].is_array();
        if (hasRulesArr && !schema2["rules"].empty())
        {
            rulesArr = schema2["rules"];
        }
        else if (hasAlarmsArr)
        {
            // Backward-compatible: accept opcbridge's alarms.json schema:
            // { "alarms": [ { id, connection_id, tag_name, type, threshold, hysteresis, enabled }, ... ] }
            rulesArr = json::array();
            for (const auto &a : schema2["alarms"])
            {
                if (!a.is_object()) continue;
                const std::string type = a.value("type", "");
                json r;
                r["id"] = a.value("id", "");
                r["name"] = a.value("name", a.value("description", a.value("id", "")));
                r["enabled"] = a.value("enabled", true);
                r["severity"] = a.value("severity", 500);
                r["message_on_active"] = a.value("message_on_active", a.value("message", ""));
                r["message_on_return"] = a.value("message_on_return", "");
                r["group"] = a.value("group", "");
                r["site"] = a.value("site", "");
                if (a.contains("repeat_ms")) r["repeat_ms"] = a["repeat_ms"];
                if (a.contains("delay_ms")) r["delay_ms"] = a["delay_ms"];
                if (a.contains("audible_enabled")) r["audible_enabled"] = a["audible_enabled"];
                if (a.contains("audio_file")) r["audio_file"] = a["audio_file"];
                if (a.contains("speech_text")) r["speech_text"] = a["speech_text"];
                if (a.contains("audio_mode")) r["audio_mode"] = a["audio_mode"];
                if (a.contains("audio_gap_ms")) r["audio_gap_ms"] = a["audio_gap_ms"];
                if (a.contains("audio_files")) r["audio_files"] = a["audio_files"];
                if (a.contains("speech_texts")) r["speech_texts"] = a["speech_texts"];
                r["source"] = {
                    {"connection_id", a.value("connection_id", "")},
                    {"tag", a.value("tag_name", a.value("tag", ""))}
                };
                r["condition"] = {{"type", type}};
                if (type == "equals" || type == "not_equals" || type == "contains" || type == "not_contains")
                {
                    if (a.contains("value")) r["condition"]["value"] = a["value"];
                    else if (a.contains("equals_value")) r["condition"]["value"] = a["equals_value"];
                    // Backward-compat / UI convenience: allow type=equals to use "threshold" as the target value.
                    else if (a.contains("threshold")) r["condition"]["value"] = a["threshold"];
                }
                else if (type == "high" || type == "low")
                {
                    if (a.contains("threshold")) r["condition"]["threshold"] = a["threshold"];
                    if (a.contains("hysteresis")) r["condition"]["hysteresis"] = a["hysteresis"];
                }
                rulesArr.push_back(r);
            }
        }
        else if (hasRulesArr)
        {
            // Accept an empty {"rules": []} config (no alarms configured).
            rulesArr = schema2["rules"];
        }
        else
        {
            throw std::runtime_error("Invalid alarms.json; expected {\"rules\":[...]} or {\"alarms\":[...]}");
        }

        if (notifications)
        {
            notifications->configure(notification_config_from_root(schema2));
        }

        for (const auto &it : rulesArr)
        {
            if (!it.is_object()) continue;
            AlarmRule r;
            r.id = it.value("id", "");
            r.name = it.value("name", r.id);
            r.group = it.value("group", "");
            r.site = it.value("site", "");
            r.enabled = it.value("enabled", true);
            r.site_enabled = resolve_alarm_site_enabled(schema2, it);
            r.severity = it.value("severity", 500);
            r.delay_ms = std::max<int64_t>(0, it.value("delay_ms", 0LL));
            if (it.contains("source") && it["source"].is_object())
            {
                r.connection_id = it["source"].value("connection_id", "");
                r.tag = it["source"].value("tag", "");
            }
            if (it.contains("condition") && it["condition"].is_object())
            {
                r.condition_type = it["condition"].value("type", "equals");
                if (r.condition_type == "equals" || r.condition_type == "not_equals" || r.condition_type == "contains" || r.condition_type == "not_contains")
                {
                    r.condition_value = it["condition"].contains("value") ? it["condition"]["value"] : json();
                }
                else if (r.condition_type == "high" || r.condition_type == "low")
                {
                    r.threshold = it["condition"].value("threshold", 0.0);
                    r.hysteresis = it["condition"].value("hysteresis", 0.0);
                }
            }
            r.message_on_active = it.value("message_on_active", "");
            r.message_on_return = it.value("message_on_return", "");
            r.notification_policy = it.value("notification_policy", "");
            const ResolvedAlarmAudio audio = resolve_alarm_audio(schema2, it, dirname_of(path));
            r.audible_enabled = audio.audible_enabled;
            r.audio_file = audio.audio_file;
            r.audio_path = audio.audio_path;
            r.speech_text = audio.speech_text;
            r.audio_files = audio.audio_files;
            r.audio_paths = audio.audio_paths;
            r.speech_texts = audio.speech_texts;
            r.audio_gap_ms = audio.audio_gap_ms;
            r.audio_mode = audio.audio_mode;
            const ResolvedAlarmRepeat rep = resolve_alarm_repeat(schema2, it);
            r.repeat_override = rep.repeat_override;
            r.repeat_ms = rep.repeat_ms;

            if (r.id.empty() || r.connection_id.empty() || r.tag.empty()) continue;

            nextRules[r.id] = r;

            AlarmState s;
            s.alarm_id = r.id;
            s.name = r.name;
            s.group = r.group;
            s.site = r.site;
            s.severity = r.severity;
            s.enabled = r.enabled;
            s.site_enabled = r.site_enabled;
            s.connection_id = r.connection_id;
            s.tag = r.tag;
            s.active = false;
            s.acked = false;
            s.initialized = false;
            s.return_notification_armed = false;
            s.effective_delay_ms = std::max(nextGlobalDelayMs, r.delay_ms);
            s.active_since_ms = 0;
            s.last_change_ms = 0;
            s.last_value = nullptr;
            s.message = "";
            s.message_on_active = r.message_on_active;
            s.message_on_return = r.message_on_return;
            s.audible_enabled = r.audible_enabled;
            s.audio_file = r.audio_file;
            s.audio_path = r.audio_path;
            s.speech_text = r.speech_text;
            s.audio_files = r.audio_files;
            s.audio_paths = r.audio_paths;
            s.speech_texts = r.speech_texts;
            s.audio_gap_ms = r.audio_gap_ms;
            s.audio_mode = r.audio_mode;
            s.notification_policy = r.notification_policy;
            s.repeat_override = r.repeat_override;
            s.repeat_ms = r.repeat_ms;
            nextStates[r.id] = s;

            const std::string key = r.connection_id + ":" + r.tag;
            nextByKey[key].push_back(r.id);
        }

        {
            std::lock_guard<std::mutex> lock(mu);
            rules.swap(nextRules);
            states.swap(nextStates);
            rulesByTagKey.swap(nextByKey);
            global_delay_ms = nextGlobalDelayMs;
        }

        if (ua)
        {
            std::vector<AlarmState> snap;
            {
                std::lock_guard<std::mutex> lock(mu);
                snap.reserve(states.size());
                for (const auto& kv : states) snap.push_back(kv.second);
            }
            ua->sync_alarms(snap);
        }
    }

    std::vector<std::string> subscription_keys() const
    {
        std::lock_guard<std::mutex> lock(mu);
        std::vector<std::string> keys;
        keys.reserve(rulesByTagKey.size());
        for (const auto &kv : rulesByTagKey) keys.push_back(kv.first);
        return keys;
    }

    static std::optional<int> normalize_quality(const json& quality)
    {
        if (quality.is_null()) return std::nullopt;
        if (quality.is_boolean()) return quality.get<bool>() ? 1 : 0;
        if (quality.is_number_integer()) return quality.get<int>();
        if (quality.is_number_float()) return static_cast<int>(quality.get<double>());
        if (!quality.is_string()) return std::nullopt;
        std::string text = quality.get<std::string>();
        std::transform(text.begin(), text.end(), text.begin(), [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
        if (text.empty()) return std::nullopt;
        if (text == "good" || text == "ok" || text == "true") return 1;
        if (text == "bad" || text == "bad_handle" || text == "stale" || text == "false") return 0;
        try { return std::stoi(text); } catch (...) {}
        return std::nullopt;
    }

    void apply_tag_update(const std::string &connection_id, const std::string &tag, const json &value)
    {
        apply_tag_update(connection_id, tag, value, json(), true);
    }

    void apply_tag_update(const std::string &connection_id, const std::string &tag, const json &value, bool recordEvent)
    {
        apply_tag_update(connection_id, tag, value, json(), recordEvent);
    }

    void apply_tag_update(const std::string &connection_id, const std::string &tag, const json &value, const json &quality, bool recordEvent)
    {
        last_tag_update_ms.store(now_ms());
        const auto normalizedQuality = normalize_quality(quality);
        const std::string key = connection_id + ":" + tag;
        if (normalizedQuality.has_value() && normalizedQuality.value() == 0) {
            std::lock_guard<std::mutex> lock(mu);
            auto it = rulesByTagKey.find(key);
            if (it != rulesByTagKey.end()) {
                for (const auto &alarmId : it->second) {
                    auto sit = states.find(alarmId);
                    if (sit == states.end()) continue;
                    sit->second.pending = false;
                    sit->second.pending_record_event = false;
                    sit->second.pending_since_ms = 0;
                }
            }
            return;
        }

        std::vector<AlarmState> changed;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = rulesByTagKey.find(key);
            if (it == rulesByTagKey.end()) return;

            for (const auto &alarmId : it->second)
            {
                auto rit = rules.find(alarmId);
                auto sit = states.find(alarmId);
                if (rit == rules.end() || sit == states.end()) continue;

                const AlarmRule &r = rit->second;
                AlarmState &s = sit->second;
                s.last_value = value;

                const int64_t t = now_ms();
                const bool shelved = s.shelved_until_ms.has_value() && t < s.shelved_until_ms.value();
                if (!r.site_enabled)
                {
                    // Re-enable should baseline before notifying, so keep disabled
                    // sites uninitialized while they are suppressed.
                    s.initialized = false;
                    s.site_enabled = false;
                    s.pending = false;
                    s.pending_since_ms = 0;
                    if (s.active)
                    {
                        s.active = false;
                        s.return_notification_armed = false;
                        s.last_change_ms = t;
                        s.message = "";
                        last_alarm_change_ms.store(t);
                        if (ws && ws->enabled.load()) {
                            json msg;
                            msg["type"] = "alarm_state";
                            msg["ts_ms"] = t;
                            msg["alarm"] = alarm_state_to_json(s);
                            ws->broadcast(msg);
                        }
                        changed.push_back(s);
                    }
                    continue;
                }
                s.site_enabled = true;
                const bool can_eval = r.enabled && !shelved;
                if (!can_eval) {
                    s.pending = false;
                    s.pending_since_ms = 0;
                }

                bool should_be_active = false;
                if (can_eval)
                {
                    if (r.condition_type == "equals" || r.condition_type == "not_equals")
                    {
                        if (!r.condition_value.is_null())
                        {
                            const bool match = json_equalish(value, r.condition_value);
                            should_be_active = (r.condition_type == "equals") ? match : !match;
                        }
                    }
                    else if (r.condition_type == "contains" || r.condition_type == "not_contains")
                    {
                        if (!r.condition_value.is_null())
                        {
                            const std::string cur = json_text_value(value);
                            const std::string target = json_text_value(r.condition_value);
                            const bool match = cur.find(target) != std::string::npos;
                            should_be_active = (r.condition_type == "contains") ? match : !match;
                        }
                    }
                    else if (r.condition_type == "empty" || r.condition_type == "not_empty")
                    {
                        const bool match = json_text_value(value).empty();
                        should_be_active = (r.condition_type == "empty") ? match : !match;
                    }
                    else if (r.condition_type == "high" || r.condition_type == "low")
                    {
                        auto num = coerce_number(value);
                        if (num.has_value())
                        {
                            const double x = num.value();
                            const double h = r.hysteresis;
                            if (r.condition_type == "high")
                            {
                                if (!s.active) should_be_active = (x >= r.threshold);
                                else should_be_active = !(x <= (r.threshold - h));
                            }
                            else
                            {
                                if (!s.active) should_be_active = (x <= r.threshold);
                                else should_be_active = !(x >= (r.threshold + h));
                            }
                        }
                    }
                }

                if (should_be_active && !s.active)
                {
                    if (s.effective_delay_ms > 0)
                    {
                        if (!s.pending)
                        {
                            s.pending = true;
                            s.pending_since_ms = t;
                            s.pending_record_event = s.initialized && recordEvent;
                        }
                        s.initialized = true;
                        continue;
                    }
                    if (!s.initialized)
                    {
                        // First value after a new/reloaded alarm is a baseline, not a
                        // new active transition. Update live state without notifications.
                        s.initialized = true;
                        s.active = true;
                        s.acked = false;
                        s.return_notification_armed = false;
                        s.active_since_ms = t;
                        s.last_change_ms = t;
                        s.message = r.message_on_active.empty() ? s.name : r.message_on_active;
                        last_alarm_change_ms.store(t);
                        if (ws && ws->enabled.load()) {
                            json msg;
                            msg["type"] = "alarm_state";
                            msg["ts_ms"] = t;
                            msg["alarm"] = alarm_state_to_json(s);
                            ws->broadcast(msg);
                        }
                        changed.push_back(s);
                        continue;
                    }

                    s.active = true;
                    s.acked = false;
                    s.return_notification_armed = recordEvent;
                    s.active_since_ms = t;
                    s.last_change_ms = t;
                    s.message = r.message_on_active.empty() ? s.name : r.message_on_active;
                    last_alarm_change_ms.store(t);
                    if (recordEvent)
                    {
                        std::cout << "[alarms] ACTIVE " << s.alarm_id
                                  << " (" << s.connection_id << ":" << s.tag << ")"
                                  << " value=" << s.last_value.dump()
                                  << " severity=" << s.severity << "\n";
                        log_event(s, "active", s.last_value);
                        if (notifications) notifications->notify_event(s, "active");
                    }
                    if (ws && ws->enabled.load()) {
                        json msg;
                        msg["type"] = "alarm_state";
                        msg["ts_ms"] = t;
                        msg["alarm"] = alarm_state_to_json(s);
                        ws->broadcast(msg);
                    }
                    changed.push_back(s);
                }
                else if (!should_be_active && s.active)
                {
                    s.pending = false;
                    s.pending_since_ms = 0;
                    const bool notify_return = recordEvent && s.return_notification_armed;
                    s.active = false;
                    s.return_notification_armed = false;
                    s.active_since_ms = 0;
                    s.last_change_ms = t;
                    s.message = r.message_on_return.empty() ? "" : r.message_on_return;
                    last_alarm_change_ms.store(t);
                    if (notify_return)
                    {
                        std::cout << "[alarms] RETURN " << s.alarm_id
                                  << " (" << s.connection_id << ":" << s.tag << ")"
                                  << " value=" << s.last_value.dump()
                                  << "\n";
                        log_event(
                            s,
                            "return",
                            s.last_value
                        );
                        if (notifications) notifications->notify_event(s, "return");
                    }
                    if (ws && ws->enabled.load()) {
                        json msg;
                        msg["type"] = "alarm_state";
                        msg["ts_ms"] = t;
                        msg["alarm"] = alarm_state_to_json(s);
                        ws->broadcast(msg);
                    }
                    changed.push_back(s);
                }
                else if (!s.initialized)
                {
                    s.initialized = true;
                }
                else if (!should_be_active && s.pending)
                {
                    s.pending = false;
                    s.pending_since_ms = 0;
                    s.pending_record_event = false;
                }
            }
        }

        if (ua)
        {
            for (const auto& s : changed) ua->upsert_alarm(s);
        }
    }

    void process_pending_activations()
    {
        std::vector<AlarmState> changed;
        const int64_t t = now_ms();
        {
            std::lock_guard<std::mutex> lock(mu);
            for (auto &kv : states)
            {
                AlarmState &s = kv.second;
                if (!s.pending || s.active || s.effective_delay_ms <= 0) continue;
                auto rit = rules.find(s.alarm_id);
                const bool shelved = s.shelved_until_ms.has_value() && t < s.shelved_until_ms.value();
                if (rit == rules.end() || !rit->second.enabled || !rit->second.site_enabled || shelved) {
                    s.pending = false;
                    s.pending_record_event = false;
                    s.pending_since_ms = 0;
                    continue;
                }
                if ((t - s.pending_since_ms) < s.effective_delay_ms) continue;

                const bool recordEvent = s.pending_record_event;
                s.pending = false;
                s.pending_record_event = false;
                s.pending_since_ms = 0;
                s.active = true;
                s.acked = false;
                s.return_notification_armed = recordEvent;
                s.active_since_ms = t;
                s.last_change_ms = t;
                if (rit != rules.end()) {
                    s.message = rit->second.message_on_active.empty() ? s.name : rit->second.message_on_active;
                }
                last_alarm_change_ms.store(t);
                if (recordEvent)
                {
                    std::cout << "[alarms] ACTIVE " << s.alarm_id
                              << " after " << s.effective_delay_ms << " ms delay\n";
                    log_event(s, "active", s.last_value);
                    if (notifications) notifications->notify_event(s, "active");
                }
                if (ws && ws->enabled.load()) {
                    json msg;
                    msg["type"] = "alarm_state";
                    msg["ts_ms"] = t;
                    msg["alarm"] = alarm_state_to_json(s);
                    ws->broadcast(msg);
                }
                changed.push_back(s);
            }
        }
        if (ua) for (const auto &s : changed) ua->upsert_alarm(s);
    }

    bool ack(const std::string &alarm_id, const std::string& actor = "", const std::string& note = "")
    {
        AlarmState snapshot;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = states.find(alarm_id);
            if (it == states.end()) return false;
            it->second.acked = true;
            it->second.last_change_ms = now_ms();
            last_alarm_change_ms.store(it->second.last_change_ms);
            log_event(it->second, "ack", it->second.last_value, actor, note);
            if (notifications) notifications->notify_event(it->second, "ack");
            if (ws && ws->enabled.load()) {
                json msg;
                msg["type"] = "alarm_state";
                msg["ts_ms"] = it->second.last_change_ms;
                msg["alarm"] = alarm_state_to_json(it->second);
                ws->broadcast(msg);
            }
            snapshot = it->second;
        }
        if (ua) ua->upsert_alarm(snapshot);
        return true;
    }

    bool shelve(const std::string &alarm_id, int64_t until_ms, const std::string& actor = "", const std::string& note = "")
    {
        AlarmState snapshot;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = states.find(alarm_id);
            if (it == states.end()) return false;
            it->second.shelved_until_ms = until_ms;
            it->second.last_change_ms = now_ms();
            last_alarm_change_ms.store(it->second.last_change_ms);
            json v;
            v["until_ms"] = until_ms;
            log_event(it->second, "shelve", v, actor, note);
            if (notifications) notifications->notify_event(it->second, "shelve");
            if (ws && ws->enabled.load()) {
                json msg;
                msg["type"] = "alarm_state";
                msg["ts_ms"] = it->second.last_change_ms;
                msg["alarm"] = alarm_state_to_json(it->second);
                ws->broadcast(msg);
            }
            snapshot = it->second;
        }
        if (ua) ua->upsert_alarm(snapshot);
        return true;
    }

    bool unshelve(const std::string &alarm_id, const std::string& actor = "", const std::string& note = "")
    {
        AlarmState snapshot;
        {
            std::lock_guard<std::mutex> lock(mu);
            auto it = states.find(alarm_id);
            if (it == states.end()) return false;
            it->second.shelved_until_ms.reset();
            it->second.last_change_ms = now_ms();
            last_alarm_change_ms.store(it->second.last_change_ms);
            log_event(it->second, "unshelve", it->second.last_value, actor, note);
            if (notifications) notifications->notify_event(it->second, "unshelve");
            if (ws && ws->enabled.load()) {
                json msg;
                msg["type"] = "alarm_state";
                msg["ts_ms"] = it->second.last_change_ms;
                msg["alarm"] = alarm_state_to_json(it->second);
                ws->broadcast(msg);
            }
            snapshot = it->second;
        }
        if (ua) ua->upsert_alarm(snapshot);
        return true;
    }

    json get_active(bool only_unacked) const
    {
        std::lock_guard<std::mutex> lock(mu);
        json out = json::array();
        for (const auto &kv : states)
        {
            const AlarmState &s = kv.second;
            if (!s.enabled) continue;
            if (!s.active) continue;
            if (only_unacked && s.acked) continue;
            out.push_back(alarm_state_to_json(s));
        }
        return out;
    }

    void counts(int &active, int &unacked, int &shelved, int &disabled) const
    {
        std::lock_guard<std::mutex> lock(mu);
        active = unacked = shelved = disabled = 0;
        const int64_t t = now_ms();
        for (const auto &kv : states)
        {
            const AlarmState &s = kv.second;
            if (!s.enabled) disabled++;
            if (s.shelved_until_ms.has_value() && t < s.shelved_until_ms.value()) shelved++;
            if (s.active) active++;
            if (s.active && !s.acked) unacked++;
        }
    }
};

// -----------------------------
// OPC UA (open62541) server for alarms
// -----------------------------

static std::string ua_string_to_std(const UA_String& s)
{
    if (!s.data || s.length == 0) return "";
    return std::string(reinterpret_cast<const char*>(s.data), s.length);
}

static void ua_write_scalar(UA_Server* server, const UA_NodeId& nodeId, const void* data, const UA_DataType* type)
{
    UA_Variant v;
    UA_Variant_init(&v);
    UA_Variant_setScalarCopy(&v, data, type);
    (void)UA_Server_writeValue(server, nodeId, v);
    UA_Variant_clear(&v);
}

static void ua_write_string(UA_Server* server, const UA_NodeId& nodeId, const std::string& value)
{
    UA_String s = UA_STRING(const_cast<char*>(value.c_str()));
    UA_Variant v;
    UA_Variant_init(&v);
    UA_Variant_setScalarCopy(&v, &s, &UA_TYPES[UA_TYPES_STRING]);
    (void)UA_Server_writeValue(server, nodeId, v);
    UA_Variant_clear(&v);
}

static std::string get_hostname()
{
    char buf[256];
    buf[0] = '\0';
    if (gethostname(buf, sizeof(buf) - 1) != 0) return "opcbridge-alarms";
    buf[sizeof(buf) - 1] = '\0';
    std::string out(buf);
    if (out.empty()) out = "opcbridge-alarms";
    return out;
}

static std::string get_primary_ipv4()
{
    struct ifaddrs* ifaddr = nullptr;
    if (getifaddrs(&ifaddr) != 0 || !ifaddr) return "127.0.0.1";

    std::string best = "127.0.0.1";
    for (auto* it = ifaddr; it; it = it->ifa_next)
    {
        if (!it->ifa_addr) continue;
        if (it->ifa_addr->sa_family != AF_INET) continue;
        if (!(it->ifa_flags & IFF_UP)) continue;
        if (it->ifa_flags & IFF_LOOPBACK) continue;

        char addr[INET_ADDRSTRLEN];
        const auto* sa = reinterpret_cast<const sockaddr_in*>(it->ifa_addr);
        if (!inet_ntop(AF_INET, &sa->sin_addr, addr, sizeof(addr))) continue;
        best = addr;
        break;
    }

    freeifaddrs(ifaddr);
    return best;
}

bool AlarmUa::start(uint16_t portIn, AlarmEngine* engineIn, std::string& err)
{
    std::lock_guard<std::mutex> lock(mu);
    if (enabled.load()) return true;
    if (!engineIn)
    {
        err = "missing engine";
        return false;
    }
    port = portIn;
    engine = engineIn;
    stopFlag = false;
    pending.clear();
    methodContexts.clear();
    nodesById.clear();
    enabled.store(true);
    thread = std::thread([this]() { ua_thread_main(); });
    return true;
}

void AlarmUa::stop()
{
    {
        std::lock_guard<std::mutex> lock(mu);
        if (!enabled.load()) return;
        stopFlag = true;
        cv.notify_all();
    }
    if (thread.joinable()) thread.join();
    enabled.store(false);
}

void AlarmUa::sync_alarms(const std::vector<AlarmState>& states)
{
    if (!enabled.load()) return;
    {
        std::lock_guard<std::mutex> lock(mu);
        for (const auto& s : states) pending.push_back(s);
    }
    cv.notify_all();
}

void AlarmUa::upsert_alarm(const AlarmState& state)
{
    if (!enabled.load()) return;
    {
        std::lock_guard<std::mutex> lock(mu);
        pending.push_back(state);
        if (pending.size() > 10000) pending.erase(pending.begin(), pending.begin() + 5000);
    }
    cv.notify_all();
}

UA_StatusCode AlarmUa::method_callback(UA_Server* /*server*/,
                                      const UA_NodeId* /*sessionId*/, void* /*sessionContext*/,
                                      const UA_NodeId* /*methodId*/, void* methodContext,
                                      const UA_NodeId* /*objectId*/, void* /*objectContext*/,
                                      size_t inputSize, const UA_Variant* input,
                                      size_t outputSize, UA_Variant* output)
{
    auto* ctx = static_cast<MethodContext*>(methodContext);
    if (!ctx || !ctx->engine)
        return UA_STATUSCODE_BADINTERNALERROR;

    auto read_string = [&](size_t i) -> std::string {
        if (!input || i >= inputSize) return "";
        if (!UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_STRING])) return "";
        const UA_String* s = static_cast<const UA_String*>(input[i].data);
        return s ? ua_string_to_std(*s) : "";
    };

    auto read_i64 = [&](size_t i) -> int64_t {
        if (!input || i >= inputSize) return 0;
        if (UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_INT64]))
        {
            return *static_cast<const UA_Int64*>(input[i].data);
        }
        if (UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_UINT64]))
        {
            return static_cast<int64_t>(*static_cast<const UA_UInt64*>(input[i].data));
        }
        if (UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_INT32]))
        {
            return static_cast<int64_t>(*static_cast<const UA_Int32*>(input[i].data));
        }
        if (UA_Variant_hasScalarType(&input[i], &UA_TYPES[UA_TYPES_UINT32]))
        {
            return static_cast<int64_t>(*static_cast<const UA_UInt32*>(input[i].data));
        }
        return 0;
    };

    bool ok = false;
    if (ctx->action == MethodAction::Ack)
    {
        const std::string actor = read_string(0);
        const std::string note = read_string(1);
        ok = ctx->engine->ack(ctx->alarm_id, actor, note);
    }
    else if (ctx->action == MethodAction::Unshelve)
    {
        const std::string actor = read_string(0);
        const std::string note = read_string(1);
        ok = ctx->engine->unshelve(ctx->alarm_id, actor, note);
    }
    else if (ctx->action == MethodAction::Shelve)
    {
        const int64_t duration_ms = read_i64(0);
        const std::string actor = read_string(1);
        const std::string note = read_string(2);
        if (duration_ms > 0)
        {
            const int64_t until_ms = now_ms() + duration_ms;
            ok = ctx->engine->shelve(ctx->alarm_id, until_ms, actor, note);
        }
    }

    if (output && outputSize >= 1)
    {
        UA_Boolean outOk = ok ? UA_TRUE : UA_FALSE;
        UA_Variant_setScalarCopy(&output[0], &outOk, &UA_TYPES[UA_TYPES_BOOLEAN]);
    }

    return UA_STATUSCODE_GOOD;
}

void AlarmUa::ua_thread_main()
{
    server = UA_Server_new();
    if (!server)
    {
        std::cerr << "[alarms] OPC UA: UA_Server_new failed\n";
        enabled.store(false);
        return;
    }

    UA_ServerConfig* config = UA_Server_getConfig(server);
    UA_ServerConfig_setMinimal(config, port, nullptr);
    ns = UA_Server_addNamespace(server, "opcbridge-alarms");

    // Replace open62541's default application name ("open62541-based ...") with something human-friendly.
    const std::string appName = get_hostname() + "@" + get_primary_ipv4();
    UA_LocalizedText_clear(&config->applicationDescription.applicationName);
    config->applicationDescription.applicationName = UA_LOCALIZEDTEXT_ALLOC("en-US", appName.c_str());

    // Keep these stable and non-default to avoid confusing UA clients.
    UA_String_clear(&config->applicationDescription.applicationUri);
    UA_String_clear(&config->applicationDescription.productUri);
    config->applicationDescription.applicationUri = UA_STRING_ALLOC(("urn:" + appName).c_str());
    config->applicationDescription.productUri = UA_STRING_ALLOC("urn:opcbridge-alarms");

    // Create root folder: Objects/Alarms
    {
        UA_ObjectAttributes attr = UA_ObjectAttributes_default;
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", "Alarms");

        UA_Server_addObjectNode(
            server,
            UA_NODEID_NULL,
            UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),
            UA_NODEID_NUMERIC(0, UA_NS0ID_ORGANIZES),
            UA_QUALIFIEDNAME(ns, (char*)"Alarms"),
            UA_NODEID_NUMERIC(0, UA_NS0ID_FOLDERTYPE),
            attr,
            nullptr,
            &alarmsFolderId
        );
        UA_LocalizedText_clear(&attr.displayName);
    }

    const UA_StatusCode startupRc = UA_Server_run_startup(server);
    if (startupRc != UA_STATUSCODE_GOOD)
    {
        std::cerr << "[alarms] OPC UA: startup failed (status 0x" << std::hex << startupRc << std::dec << ")\n";
        UA_Server_delete(server);
        server = nullptr;
        enabled.store(false);
        return;
    }

    while (true)
    {
        std::vector<AlarmState> batch;
        {
            std::unique_lock<std::mutex> lock(mu);
            cv.wait_for(lock, std::chrono::milliseconds(250), [&]() { return stopFlag || !pending.empty(); });
            if (stopFlag) break;
            batch.swap(pending);
        }

        // Coalesce by alarm_id (last writer wins)
        std::unordered_map<std::string, AlarmState> latest;
        latest.reserve(batch.size());
        for (auto& s : batch) latest[s.alarm_id] = std::move(s);

        for (const auto& kv : latest)
        {
            ensure_alarm_nodes_locked(kv.second);
            write_alarm_locked(kv.second);
        }

        UA_Server_run_iterate(server, false);
    }

    (void)UA_Server_run_shutdown(server);
    UA_Server_delete(server);
    server = nullptr;
}

void AlarmUa::ensure_server_locked()
{
    // No-op: server is created in ua_thread_main; writes happen only there.
}

void AlarmUa::ensure_alarm_nodes_locked(const AlarmState& s)
{
    if (!server) return;
    if (s.alarm_id.empty()) return;
    if (nodesById.find(s.alarm_id) != nodesById.end()) return;

    AlarmNodes nodes;

    // Alarm object under Alarms folder
    {
        const std::string displayName = s.name.empty() ? s.alarm_id : s.name;
        UA_ObjectAttributes attr = UA_ObjectAttributes_default;
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", displayName.c_str());

        UA_Server_addObjectNode(
            server,
            UA_NODEID_NULL,
            alarmsFolderId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_ORGANIZES),
            UA_QUALIFIEDNAME(ns, (char*)s.alarm_id.c_str()),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEOBJECTTYPE),
            attr,
            nullptr,
            &nodes.objectId
        );
        UA_LocalizedText_clear(&attr.displayName);
    }

    auto add_bool = [&](const char* browse, UA_NodeId& outId) {
        UA_VariableAttributes attr = UA_VariableAttributes_default;
        UA_Boolean init = UA_FALSE;
        UA_Variant_setScalarCopy(&attr.value, &init, &UA_TYPES[UA_TYPES_BOOLEAN]);
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        UA_Server_addVariableNode(
            server, UA_NODEID_NULL, nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
            attr, nullptr, &outId);
        UA_LocalizedText_clear(&attr.displayName);
    };

    auto add_i32 = [&](const char* browse, UA_NodeId& outId) {
        UA_VariableAttributes attr = UA_VariableAttributes_default;
        UA_Int32 init = 0;
        UA_Variant_setScalarCopy(&attr.value, &init, &UA_TYPES[UA_TYPES_INT32]);
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        UA_Server_addVariableNode(
            server, UA_NODEID_NULL, nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
            attr, nullptr, &outId);
        UA_LocalizedText_clear(&attr.displayName);
    };

    auto add_i64 = [&](const char* browse, UA_NodeId& outId) {
        UA_VariableAttributes attr = UA_VariableAttributes_default;
        UA_Int64 init = 0;
        UA_Variant_setScalarCopy(&attr.value, &init, &UA_TYPES[UA_TYPES_INT64]);
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        UA_Server_addVariableNode(
            server, UA_NODEID_NULL, nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
            attr, nullptr, &outId);
        UA_LocalizedText_clear(&attr.displayName);
    };

    auto add_string = [&](const char* browse, UA_NodeId& outId) {
        UA_VariableAttributes attr = UA_VariableAttributes_default;
        UA_String init = UA_STRING(const_cast<char*>(""));
        UA_Variant_setScalarCopy(&attr.value, &init, &UA_TYPES[UA_TYPES_STRING]);
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        UA_Server_addVariableNode(
            server, UA_NODEID_NULL, nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE),
            attr, nullptr, &outId);
        UA_LocalizedText_clear(&attr.displayName);
    };

    add_string("AlarmId", nodes.id);
    add_string("Name", nodes.name);
    add_string("Message", nodes.message);
    add_i32("Severity", nodes.severity);
    add_bool("Enabled", nodes.enabledVar);
    add_bool("Active", nodes.active);
    add_bool("Acked", nodes.acked);
    add_i64("ShelvedUntilMs", nodes.shelvedUntil);
    add_i64("ActiveSinceMs", nodes.activeSince);
    add_i64("LastChangeMs", nodes.lastChange);
    add_string("ConnectionId", nodes.connectionId);
    add_string("Tag", nodes.tag);
    add_string("LastValue", nodes.lastValue);

    auto add_method = [&](const char* browse,
                          MethodAction action,
                          const std::vector<std::pair<std::string, UA_UInt32>>& inputs,
                          const std::vector<std::pair<std::string, UA_UInt32>>& outputs)
    {
        UA_MethodAttributes attr = UA_MethodAttributes_default;
        attr.displayName = UA_LOCALIZEDTEXT_ALLOC("en-US", browse);
        attr.executable = true;
        attr.userExecutable = true;

        std::vector<UA_Argument> inArgs;
        inArgs.resize(inputs.size());
        for (size_t i = 0; i < inputs.size(); i++)
        {
            UA_Argument_init(&inArgs[i]);
            inArgs[i].name = UA_STRING_ALLOC(inputs[i].first.c_str());
            inArgs[i].description = UA_LOCALIZEDTEXT_ALLOC("en-US", inputs[i].first.c_str());
            inArgs[i].dataType = UA_TYPES[inputs[i].second].typeId;
            inArgs[i].valueRank = -1;
        }

        std::vector<UA_Argument> outArgs;
        outArgs.resize(outputs.size());
        for (size_t i = 0; i < outputs.size(); i++)
        {
            UA_Argument_init(&outArgs[i]);
            outArgs[i].name = UA_STRING_ALLOC(outputs[i].first.c_str());
            outArgs[i].description = UA_LOCALIZEDTEXT_ALLOC("en-US", outputs[i].first.c_str());
            outArgs[i].dataType = UA_TYPES[outputs[i].second].typeId;
            outArgs[i].valueRank = -1;
        }

        auto ctx = std::make_unique<MethodContext>();
        ctx->ua = this;
        ctx->engine = engine;
        ctx->alarm_id = s.alarm_id;
        ctx->action = action;
        MethodContext* ctxRaw = ctx.get();
        methodContexts.push_back(std::move(ctx));

        UA_NodeId methodId = UA_NODEID_NULL;
        UA_Server_addMethodNode(
            server,
            UA_NODEID_NULL,
            nodes.objectId,
            UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
            UA_QUALIFIEDNAME(ns, (char*)browse),
            attr,
            &AlarmUa::method_callback,
            inArgs.size(), inArgs.data(),
            outArgs.size(), outArgs.data(),
            ctxRaw,
            &methodId
        );

        UA_LocalizedText_clear(&attr.displayName);
        for (auto& a : inArgs) { UA_LocalizedText_clear(&a.description); UA_String_clear(&a.name); }
        for (auto& a : outArgs) { UA_LocalizedText_clear(&a.description); UA_String_clear(&a.name); }
    };

    add_method(
        "Ack",
        MethodAction::Ack,
        {{"actor", UA_TYPES_STRING}, {"note", UA_TYPES_STRING}},
        {{"ok", UA_TYPES_BOOLEAN}}
    );
    add_method(
        "Shelve",
        MethodAction::Shelve,
        {{"duration_ms", UA_TYPES_INT64}, {"actor", UA_TYPES_STRING}, {"note", UA_TYPES_STRING}},
        {{"ok", UA_TYPES_BOOLEAN}}
    );
    add_method(
        "Unshelve",
        MethodAction::Unshelve,
        {{"actor", UA_TYPES_STRING}, {"note", UA_TYPES_STRING}},
        {{"ok", UA_TYPES_BOOLEAN}}
    );

    nodesById[s.alarm_id] = nodes;
}

void AlarmUa::write_alarm_locked(const AlarmState& s)
{
    if (!server) return;
    const auto it = nodesById.find(s.alarm_id);
    if (it == nodesById.end()) return;
    const AlarmNodes& n = it->second;

    ua_write_string(server, n.id, s.alarm_id);
    ua_write_string(server, n.name, s.name.empty() ? s.alarm_id : s.name);
    ua_write_string(server, n.message, s.message);

    UA_Int32 sev = static_cast<UA_Int32>(s.severity);
    UA_Boolean en = s.enabled ? UA_TRUE : UA_FALSE;
    UA_Boolean act = s.active ? UA_TRUE : UA_FALSE;
    UA_Boolean ack = s.acked ? UA_TRUE : UA_FALSE;
    UA_Int64 shelveUntil = s.shelved_until_ms.has_value() ? static_cast<UA_Int64>(s.shelved_until_ms.value()) : 0;
    UA_Int64 activeSince = static_cast<UA_Int64>(s.active_since_ms);
    UA_Int64 lastChange = static_cast<UA_Int64>(s.last_change_ms);

    ua_write_scalar(server, n.severity, &sev, &UA_TYPES[UA_TYPES_INT32]);
    ua_write_scalar(server, n.enabledVar, &en, &UA_TYPES[UA_TYPES_BOOLEAN]);
    ua_write_scalar(server, n.active, &act, &UA_TYPES[UA_TYPES_BOOLEAN]);
    ua_write_scalar(server, n.acked, &ack, &UA_TYPES[UA_TYPES_BOOLEAN]);
    ua_write_scalar(server, n.shelvedUntil, &shelveUntil, &UA_TYPES[UA_TYPES_INT64]);
    ua_write_scalar(server, n.activeSince, &activeSince, &UA_TYPES[UA_TYPES_INT64]);
    ua_write_scalar(server, n.lastChange, &lastChange, &UA_TYPES[UA_TYPES_INT64]);

    ua_write_string(server, n.connectionId, s.connection_id);
    ua_write_string(server, n.tag, s.tag);
    ua_write_string(server, n.lastValue, s.last_value.is_null() ? "" : s.last_value.dump());
}

static void ws_client_loop(std::atomic<bool> &stop,
                           AlarmEngine &engine,
                           const std::string &wsUrl,
                           const std::string &opcbridgeHost,
                           uint16_t opcbridgeHttpPort,
                           std::atomic<uint64_t> &subscriptionGeneration)
{
    ix::WebSocket ws;
    ws.setUrl(wsUrl);
    ws.enablePong();
    ws.enableAutomaticReconnection();
    ws.setMinWaitBetweenReconnectionRetries(1000);
    ws.setMaxWaitBetweenReconnectionRetries(10000);
    ws.disablePerMessageDeflate();

    std::atomic<bool> connected{false};
    std::atomic<bool> baselineSeedRequested{false};
    uint64_t lastSentGeneration = 0;

    auto send_subscribe = [&]() {
        json sub;
        sub["type"] = "subscribe";
        sub["tags"] = engine.subscription_keys();
        ws.send(sub.dump());
        std::cout << "[alarms] Sent opcbridge subscribe (" << sub["tags"].size() << " tag(s))\n";
    };

    auto seed_subscriptions_from_http = [&](bool recordEvent, bool systemOnly = false) -> bool {
        const auto keys = engine.subscription_keys();
        if (keys.empty()) return true;

        std::unordered_set<std::string> want;
        want.reserve(keys.size());
        std::vector<std::pair<std::string, std::string>> wantedTags;
        wantedTags.reserve(keys.size());
        for (const auto& k : keys)
        {
            if (systemOnly && k.rfind("_system:", 0) != 0) continue;
            want.insert(k);
            const size_t sep = k.find(':');
            if (sep != std::string::npos && sep > 0 && sep + 1 < k.size())
            {
                wantedTags.push_back({k.substr(0, sep), k.substr(sep + 1)});
            }
        }
        if (want.empty()) return true;

        httplib::Client cli(opcbridgeHost, opcbridgeHttpPort);
        cli.set_read_timeout(5, 0);
        cli.set_connection_timeout(5, 0);

        auto apply_rows = [&](const json& body) -> bool {
            if (!body.is_object() || !body.contains("tags") || !body["tags"].is_array()) return false;
            for (const auto& t : body["tags"])
            {
                if (!t.is_object()) continue;
                const std::string conn = t.value("connection_id", "");
                const std::string name = t.value("name", "");
                if (conn.empty() || name.empty()) continue;
                const std::string k = conn + ":" + name;
                if (want.find(k) == want.end()) continue;
                if (!t.contains("value")) continue;
                engine.apply_tag_update(
                    conn,
                    name,
                    t["value"],
                    t.contains("quality") ? t["quality"] : json(),
                    recordEvent
                );
            }
            return true;
        };

        if (!systemOnly)
        {
            bool queryOk = false;
            for (size_t offset = 0; offset < wantedTags.size(); offset += 500)
            {
                json req;
                req["tags"] = json::array();
                const size_t end = std::min(wantedTags.size(), offset + static_cast<size_t>(500));
                for (size_t i = offset; i < end; ++i)
                {
                    req["tags"].push_back({
                        {"connection_id", wantedTags[i].first},
                        {"name", wantedTags[i].second}
                    });
                }
                auto qres = cli.Post("/tags/query", req.dump(), "application/json");
                if (!qres || qres->status != 200) {
                    queryOk = false;
                    break;
                }
                json qbody;
                try { qbody = json::parse(qres->body); } catch (...) {
                    queryOk = false;
                    break;
                }
                if (!apply_rows(qbody)) {
                    queryOk = false;
                    break;
                }
                queryOk = true;
            }
            if (queryOk) return true;
        }

        auto res = cli.Get(systemOnly ? "/tags?connection_id=_system&limit=1000" : "/tags");
        if (!res || res->status != 200) return false;

        json body;
        try
        {
            body = json::parse(res->body);
        }
        catch (...)
        {
            return false;
        }

        return apply_rows(body);
    };

    ws.setOnMessageCallback([&](const ix::WebSocketMessagePtr &msg) {
        if (!msg) return;

        if (msg->type == ix::WebSocketMessageType::Open)
        {
            connected.store(true);
            engine.opcbridge_ws_connected.store(true);
            engine.opcbridge_ws_last_open_ms.store(now_ms());
            engine.opcbridge_ws_open_count.fetch_add(1);
            // Suppress events until we have seeded current values from HTTP.
            engine.opcbridge_baselining.store(true);
            engine.suppress_events_until_ms.store(now_ms() + 30000);
            std::cout << "[alarms] opcbridge WS connected\n";
            std::cout << "[alarms] opcbridge baseline: suppress events until HTTP seed completes\n";
            lastSentGeneration = subscriptionGeneration.load();
            send_subscribe();
            baselineSeedRequested.store(true);
            return;
        }
        if (msg->type == ix::WebSocketMessageType::Close)
        {
            connected.store(false);
            engine.opcbridge_ws_connected.store(false);
            engine.opcbridge_baselining.store(true);
            engine.opcbridge_ws_last_close_ms.store(now_ms());
            engine.opcbridge_ws_close_count.fetch_add(1);
            std::cout << "[alarms] opcbridge WS closed: "
                      << msg->closeInfo.code << " " << msg->closeInfo.reason << "\n";
            return;
        }
        if (msg->type == ix::WebSocketMessageType::Error)
        {
            connected.store(false);
            engine.opcbridge_ws_connected.store(false);
            engine.opcbridge_baselining.store(true);
            engine.opcbridge_ws_last_error_ms.store(now_ms());
            engine.opcbridge_ws_error_count.fetch_add(1);
            std::cerr << "[alarms] opcbridge WS error: " << msg->errorInfo.reason << "\n";
            return;
        }
        if (msg->type != ix::WebSocketMessageType::Message) return;
        engine.opcbridge_ws_last_message_ms.store(now_ms());

        json payload;
        try {
            payload = json::parse(msg->str);
        } catch (...) {
            return;
        }

        if (!payload.is_object()) return;
        if (payload.value("type", "") != "tag_update") return;

        const std::string conn = payload.value("connection_id", "");
        const std::string tag = payload.value("name", "");
        if (conn.empty() || tag.empty()) return;
        engine.apply_tag_update(
            conn,
            tag,
            payload.contains("value") ? payload["value"] : json(),
            payload.contains("quality") ? payload["quality"] : json(),
            engine.should_record_events_now()
        );
    });

    ws.start();

    auto lastSystemRefresh = std::chrono::steady_clock::time_point{};
    auto lastSubscriptionRefresh = std::chrono::steady_clock::time_point{};
    while (!stop.load())
    {
        std::this_thread::sleep_for(std::chrono::milliseconds(250));
        if (!connected.load()) continue;
        const uint64_t gen = subscriptionGeneration.load();
        if (gen != lastSentGeneration)
        {
            lastSentGeneration = gen;
            engine.opcbridge_baselining.store(true);
            engine.suppress_events_until_ms.store(now_ms() + 30000);
            std::cout << "[alarms] opcbridge baseline: suppress events until HTTP seed completes (resubscribe)\n";
            send_subscribe();
            baselineSeedRequested.store(true);
        }
        auto nowSteady = std::chrono::steady_clock::now();
        if (baselineSeedRequested.exchange(false))
        {
            if (seed_subscriptions_from_http(false))
            {
                engine.opcbridge_baselining.store(false);
                engine.suppress_events_until_ms.store(now_ms() + 2000);
                std::cout << "[alarms] opcbridge baseline complete; event logging resumes after 2000ms\n";
                lastSubscriptionRefresh = nowSteady;
            }
            else
            {
                engine.opcbridge_baselining.store(true);
                engine.suppress_events_until_ms.store(now_ms() + 30000);
                lastSubscriptionRefresh = nowSteady;
                std::cout << "[alarms] opcbridge baseline seed failed; retrying\n";
            }
        }
        if (lastSubscriptionRefresh.time_since_epoch().count() == 0 ||
            nowSteady - lastSubscriptionRefresh >= std::chrono::seconds(2))
        {
            const bool baselineActive = engine.opcbridge_baselining.load();
            if (seed_subscriptions_from_http(!baselineActive && engine.should_record_events_now(), false))
            {
                if (baselineActive)
                {
                    engine.opcbridge_baselining.store(false);
                    engine.suppress_events_until_ms.store(now_ms() + 2000);
                    std::cout << "[alarms] opcbridge baseline complete; event logging resumes after 2000ms\n";
                }
                lastSubscriptionRefresh = nowSteady;
            }
            else if (baselineActive)
            {
                baselineSeedRequested.store(true);
            }
        }
        if (lastSystemRefresh.time_since_epoch().count() == 0 ||
            nowSteady - lastSystemRefresh >= std::chrono::seconds(2))
        {
            seed_subscriptions_from_http(true, true);
            lastSystemRefresh = nowSteady;
        }
    }

    ws.stop();
    engine.opcbridge_ws_connected.store(false);
}

static bool fetch_rules_from_opcbridge(AlarmEngine &engine,
                                      const std::string &host,
                                      uint16_t port,
                                      const std::string &adminToken,
                                      const std::string &configDir,
                                      std::string &err)
{
    httplib::Client cli(host, port);
    cli.set_read_timeout(5, 0);
    cli.set_connection_timeout(5, 0);

    httplib::Headers headers;
    if (!adminToken.empty()) {
        headers.emplace("X-Admin-Token", adminToken);
    }

    auto res = cli.Get("/config/alarms", headers);
    if (!res) {
        err = "Failed to connect to opcbridge HTTP.";
        return false;
    }
    if (res->status != 200) {
        err = "opcbridge returned HTTP " + std::to_string(res->status);
        return false;
    }

    json body;
    try {
        body = json::parse(res->body);
    } catch (...) {
        err = "Invalid JSON from /config/alarms";
        return false;
    }

    if (!body.is_object() || !body.value("ok", false)) {
        err = body.value("error", "opcbridge returned ok=false");
        return false;
    }
    if (!body.contains("json")) {
        err = "Missing json field in /config/alarms response";
        return false;
    }

    const int64_t mtime = body.contains("mtime_ms") && body["mtime_ms"].is_number_integer()
        ? body["mtime_ms"].get<int64_t>()
        : -1;

    const int64_t currentMtime = engine.last_config_mtime_ms.load();
    if (currentMtime != -1 && mtime != -1 && mtime == currentMtime)
    {
        // No config change; do not reset runtime state.
        return true;
    }

    json rulesRoot = body["json"];
    if (!rulesRoot.is_object()) {
        err = "alarms.json must be an object";
        return false;
    }

    // Defensive: some tooling may accidentally save the /config/alarms HTTP response body
    // (which includes {"json":{...}}) directly into alarms.json. If so, unwrap it.
    if (rulesRoot.contains("json") && rulesRoot["json"].is_object() &&
        (!rulesRoot.contains("rules") && !rulesRoot.contains("alarms")))
    {
        rulesRoot = rulesRoot["json"];
    }

    if (engine.notifications)
    {
        engine.notifications->set_config_dir(configDir);
    }
    const json schema2 = rulesRoot;

    // Some opcbridge deployments may report a frequently-changing mtime even when the
    // config content is unchanged. Avoid thrashing reloads by also comparing content.
    const std::string nextHash = schema2.dump();
    {
        std::lock_guard<std::mutex> lock(engine.config_hash_mu);
        if (!engine.last_config_hash.empty() && engine.last_config_hash == nextHash)
        {
            return true;
        }
    }

    if (!validate_supported_config(schema2, err))
    {
        err = "Unsupported alarms config: " + err;
        return false;
    }
    if (engine.notifications)
    {
        engine.notifications->configure(notification_config_from_root(schema2));
    }
    const json runtimeRoot = schema2;

    // Serialize to reuse existing loader/parser.
    const std::string tmp = runtimeRoot.dump(2);
    try {
        const int64_t nextGlobalDelayMs = std::max<int64_t>(0, runtimeRoot.value("alarm_delay_ms", 0LL));
        std::unordered_map<std::string, AlarmRule> nextRules;
        std::unordered_map<std::string, AlarmState> nextStates;
        std::unordered_map<std::string, std::vector<std::string>> nextByKey;

        // Normalize into an array of rule objects.
        json rulesArr = json::array();
        const bool hasRulesArr = runtimeRoot.contains("rules") && runtimeRoot["rules"].is_array();
        const bool hasAlarmsArr = runtimeRoot.contains("alarms") && runtimeRoot["alarms"].is_array();
        if (hasRulesArr && !runtimeRoot["rules"].empty())
        {
            rulesArr = runtimeRoot["rules"];
        }
        else if (hasAlarmsArr)
        {
            rulesArr = json::array();
            for (const auto &a : runtimeRoot["alarms"])
            {
                if (!a.is_object()) continue;
                const std::string type = a.value("type", "");

                json r;
                r["id"] = a.value("id", "");
                r["name"] = a.value("name", a.value("id", ""));
                r["enabled"] = a.value("enabled", true);
                r["severity"] = a.value("severity", 500);
                r["message_on_active"] = a.value("message_on_active", a.value("message", ""));
                r["message_on_return"] = a.value("message_on_return", "");
                r["group"] = a.value("group", "");
                r["site"] = a.value("site", "");
                if (a.contains("repeat_ms")) r["repeat_ms"] = a["repeat_ms"];
                if (a.contains("delay_ms")) r["delay_ms"] = a["delay_ms"];
                if (a.contains("audible_enabled")) r["audible_enabled"] = a["audible_enabled"];
                if (a.contains("audio_file")) r["audio_file"] = a["audio_file"];
                if (a.contains("speech_text")) r["speech_text"] = a["speech_text"];
                if (a.contains("audio_mode")) r["audio_mode"] = a["audio_mode"];
                if (a.contains("audio_gap_ms")) r["audio_gap_ms"] = a["audio_gap_ms"];
                if (a.contains("audio_files")) r["audio_files"] = a["audio_files"];
                if (a.contains("speech_texts")) r["speech_texts"] = a["speech_texts"];
                r["source"] = {
                    {"connection_id", a.value("connection_id", "")},
                    {"tag", a.value("tag_name", a.value("tag", ""))}
                };
                r["condition"] = {{"type", type}};
                if (type == "equals" || type == "not_equals" || type == "contains" || type == "not_contains")
                {
                    if (a.contains("value")) r["condition"]["value"] = a["value"];
                    else if (a.contains("equals_value")) r["condition"]["value"] = a["equals_value"];
                    // Backward-compat / UI convenience: allow type=equals to use "threshold" as the target value.
                    else if (a.contains("threshold")) r["condition"]["value"] = a["threshold"];
                }
                else if (type == "high" || type == "low")
                {
                    if (a.contains("threshold")) r["condition"]["threshold"] = a["threshold"];
                    if (a.contains("hysteresis")) r["condition"]["hysteresis"] = a["hysteresis"];
                }
                rulesArr.push_back(r);
            }
        }
        else if (hasRulesArr)
        {
            rulesArr = runtimeRoot["rules"];
        }

        if (!rulesArr.is_array()) throw std::runtime_error("rules must be an array");
        for (const auto &it : rulesArr)
        {
            if (!it.is_object()) continue;
            AlarmRule r;
            r.id = it.value("id", "");
            r.name = it.value("name", r.id);
            r.group = it.value("group", "");
            r.site = it.value("site", "");
            r.enabled = it.value("enabled", true);
            r.site_enabled = resolve_alarm_site_enabled(runtimeRoot, it);
            r.severity = it.value("severity", 500);
            r.delay_ms = std::max<int64_t>(0, it.value("delay_ms", 0LL));
            if (it.contains("source") && it["source"].is_object())
            {
                r.connection_id = it["source"].value("connection_id", "");
                r.tag = it["source"].value("tag", "");
            }
            if (it.contains("condition") && it["condition"].is_object())
            {
                r.condition_type = it["condition"].value("type", "equals");
                if (r.condition_type == "equals" || r.condition_type == "not_equals" || r.condition_type == "contains" || r.condition_type == "not_contains")
                {
                    r.condition_value = it["condition"].contains("value") ? it["condition"]["value"] : json();
                }
                else if (r.condition_type == "high" || r.condition_type == "low")
                {
                    r.threshold = it["condition"].value("threshold", 0.0);
                    r.hysteresis = it["condition"].value("hysteresis", 0.0);
                }
            }
            r.message_on_active = it.value("message_on_active", "");
            r.message_on_return = it.value("message_on_return", "");
            r.notification_policy = it.value("notification_policy", "");
            const ResolvedAlarmAudio audio = resolve_alarm_audio(runtimeRoot, it, configDir);
            r.audible_enabled = audio.audible_enabled;
            r.audio_file = audio.audio_file;
            r.audio_path = audio.audio_path;
            r.speech_text = audio.speech_text;
            r.audio_files = audio.audio_files;
            r.audio_paths = audio.audio_paths;
            r.speech_texts = audio.speech_texts;
            r.audio_gap_ms = audio.audio_gap_ms;
            r.audio_mode = audio.audio_mode;
            const ResolvedAlarmRepeat rep = resolve_alarm_repeat(runtimeRoot, it);
            r.repeat_override = rep.repeat_override;
            r.repeat_ms = rep.repeat_ms;

            if (r.id.empty() || r.connection_id.empty() || r.tag.empty()) continue;
            nextRules[r.id] = r;

            AlarmState s;
            s.alarm_id = r.id;
            s.name = r.name;
            s.group = r.group;
            s.site = r.site;
            s.severity = r.severity;
            s.enabled = r.enabled;
            s.site_enabled = r.site_enabled;
            s.connection_id = r.connection_id;
            s.tag = r.tag;
            s.active = false;
            s.acked = false;
            s.initialized = false;
            s.effective_delay_ms = std::max(nextGlobalDelayMs, r.delay_ms);
            s.active_since_ms = 0;
            s.last_change_ms = 0;
            s.last_value = nullptr;
            s.message = "";
            s.message_on_active = r.message_on_active;
            s.message_on_return = r.message_on_return;
            s.audible_enabled = r.audible_enabled;
            s.audio_file = r.audio_file;
            s.audio_path = r.audio_path;
            s.speech_text = r.speech_text;
            s.audio_files = r.audio_files;
            s.audio_paths = r.audio_paths;
            s.speech_texts = r.speech_texts;
            s.audio_gap_ms = r.audio_gap_ms;
            s.audio_mode = r.audio_mode;
            s.notification_policy = r.notification_policy;
            s.repeat_override = r.repeat_override;
            s.repeat_ms = r.repeat_ms;
            nextStates[r.id] = s;

            const std::string key = r.connection_id + ":" + r.tag;
            nextByKey[key].push_back(r.id);
        }

        std::lock_guard<std::mutex> lock(engine.mu);
        // Preserve runtime state across config reloads to avoid re-annunciating alarms
        // simply because alarms.json changed. Do this at swap time so we don't race
        // ongoing tag updates.
        for (auto &kv : nextStates)
        {
            const std::string &id = kv.first;
            AlarmState &s = kv.second;
            auto it = engine.states.find(id);
            if (it == engine.states.end()) continue;
            const AlarmState &prev = it->second;

            // Carry over live state; keep rule-derived fields from the new config.
            s.active = prev.active;
            s.acked = prev.acked;
            s.initialized = prev.initialized;
            s.return_notification_armed = prev.return_notification_armed;
            s.active_since_ms = prev.active_since_ms;
            s.last_change_ms = prev.last_change_ms;
            s.last_value = prev.last_value;
            s.message = prev.message;
            s.shelved_until_ms = prev.shelved_until_ms;
            s.pending = prev.pending;
            s.pending_record_event = prev.pending_record_event;
            s.pending_since_ms = prev.pending_since_ms;
        }
        engine.rules.swap(nextRules);
        engine.states.swap(nextStates);
        engine.rulesByTagKey.swap(nextByKey);
        engine.global_delay_ms = nextGlobalDelayMs;
        engine.last_config_mtime_ms.store(mtime);
        {
            std::lock_guard<std::mutex> lockHash(engine.config_hash_mu);
            engine.last_config_hash = nextHash;
        }
    } catch (const std::exception &ex) {
        err = std::string("Failed to apply rules: ") + ex.what();
        return false;
    }

    if (engine.ua)
    {
        std::vector<AlarmState> snap;
        {
            std::lock_guard<std::mutex> lock(engine.mu);
            snap.reserve(engine.states.size());
            for (const auto& kv : engine.states) snap.push_back(kv.second);
        }
        engine.ua->sync_alarms(snap);
    }

    (void)tmp;
    return true;
}

int main(int argc, char **argv)
{
    std::cout.setf(std::ios::unitbuf);
    std::cerr.setf(std::ios::unitbuf);

    std::string configDir = "config";
    std::string opcbridgeHost = "127.0.0.1";
    uint16_t opcbridgeWsPort = 8090;
    uint16_t opcbridgeHttpPort = 8080;
    uint16_t httpPort = 8085;
    bool wsMode = false;
    uint16_t wsPort = 8086;
    bool opcuaMode = false;
    uint16_t opcuaPort = 4841;
    std::string adminToken;
    std::atomic<bool> rulesFromOpcbridge{false};

    for (int i = 1; i < argc; ++i)
    {
        std::string arg = argv[i];
        if (arg == "--config" && i + 1 < argc) configDir = argv[++i];
        else if (arg == "--opcbridge-host" && i + 1 < argc) opcbridgeHost = argv[++i];
        else if (arg == "--opcbridge-ws-port" && i + 1 < argc) opcbridgeWsPort = static_cast<uint16_t>(std::stoi(argv[++i]));
        else if (arg == "--opcbridge-http-port" && i + 1 < argc) opcbridgeHttpPort = static_cast<uint16_t>(std::stoi(argv[++i]));
        else if (arg == "--http-port" && i + 1 < argc) httpPort = static_cast<uint16_t>(std::stoi(argv[++i]));
        else if (arg == "--ws") wsMode = true;
        else if (arg == "--ws-port" && i + 1 < argc) { wsPort = static_cast<uint16_t>(std::stoi(argv[++i])); wsMode = true; }
        else if (arg == "--opcua") opcuaMode = true;
        else if (arg == "--opcua-port" && i + 1 < argc) { opcuaPort = static_cast<uint16_t>(std::stoi(argv[++i])); opcuaMode = true; }
        else if (arg == "--admin-token" && i + 1 < argc) adminToken = argv[++i];
        else if (arg == "--version" || arg == "-V")
        {
            std::cout << "opcbridge-alarms version " << OPCBRIDGE_ALARMS_VERSION
                      << " (suite " << OPCBRIDGE_SUITE_VERSION << ")"
                      << " (" << __DATE__ << " " << __TIME__ << ")\n";
            return 0;
        }
    }

    const std::string alarmsPath = configDir + "/alarms.json";
    const std::string alarmsExamplePath = configDir + "/alarms.json.example";

    AlarmEngine engine;
    AlarmDb db;
    AlarmWs wsServer;
    AlarmUa uaServer;
    NotificationManager notifications;
    engine.set_notifications(&notifications);
    notifications.set_config_dir(configDir);
    notifications.set_should_continue([&engine](const std::string& alarm_id, const std::string& until) {
        return engine.should_continue_notification(alarm_id, until);
    });
    notifications.set_ack_alarm([&engine](const std::string& alarm_id, const std::string& actor, const std::string& note) {
        return engine.ack(alarm_id, actor, note);
    });
    try
    {
        const char* env = std::getenv("OPCBRIDGE_ADMIN_SERVICE_TOKEN");
        if (adminToken.empty() && env && *env) adminToken = std::string(env);

        std::string err;
        bool loadedFromOpcbridge = false;
        if (!adminToken.empty())
        {
            loadedFromOpcbridge = fetch_rules_from_opcbridge(engine, opcbridgeHost, opcbridgeHttpPort, adminToken, configDir, err);
            if (!loadedFromOpcbridge) {
                std::cerr << "[alarms] Failed to load alarms from opcbridge: " << err << "\n";
            }
        }

        if (!loadedFromOpcbridge)
        {
            try {
                engine.load_rules_from_file(alarmsPath);
            } catch (...) {
                engine.load_rules_from_file(alarmsExamplePath);
            }
        }

        rulesFromOpcbridge.store(loadedFromOpcbridge);
    }
    catch (const std::exception &ex)
    {
        std::cerr << "[alarms] Failed to load rules: " << ex.what() << "\n";
        return 1;
    }

    // Open history DB in <configDir>/data/alarms.db
    {
        const std::string dataDir = configDir + "/data";
        std::error_code ec;
        std::filesystem::create_directories(dataDir, ec);
        std::string err;
        if (!db.open_or_create(dataDir + "/alarms.db", err)) {
            std::cerr << "[alarms] DB open failed: " << err << "\n";
        } else {
            std::cout << "[alarms] DB: " << db.path << "\n";
        }
        engine.set_db(&db);
        notifications.set_db(&db);
        notifications.start();
    }

    // Restore last-known alarm state from history (so /alarm/api/alarms/all is populated after restart).
    {
        const int64_t since = now_ms() - (14LL * 24LL * 60LL * 60LL * 1000LL);
        engine.restore_state_from_db(since);
    }
    engine.set_ws(&wsServer);
    engine.set_ua(&uaServer);

    if (opcuaMode)
    {
        std::string err;
        if (!uaServer.start(opcuaPort, &engine, err))
        {
            std::cerr << "[alarms] OPC UA start failed on port " << opcuaPort << ": " << err << "\n";
        }
        else
        {
            std::vector<AlarmState> snap;
            {
                std::lock_guard<std::mutex> lock(engine.mu);
                snap.reserve(engine.states.size());
                for (const auto& kv : engine.states) snap.push_back(kv.second);
            }
            uaServer.sync_alarms(snap);
            std::cout << "[alarms] OPC UA listening on opc.tcp://0.0.0.0:" << opcuaPort << "\n";
        }
    }

    if (wsMode)
    {
        wsServer.build_snapshot = [&engine]() -> json {
            json arr = json::array();
            {
                std::lock_guard<std::mutex> lock(engine.mu);
                for (const auto& kv : engine.states) arr.push_back(alarm_state_to_json(kv.second));
            }
            json snap;
            snap["type"] = "snapshot";
            snap["ts_ms"] = now_ms();
            snap["alarms"] = arr;
            return snap;
        };

        std::string err;
        if (!wsServer.start(wsPort, err))
        {
            std::cerr << "[alarms] WS start failed on port " << wsPort << ": " << err << "\n";
        }
        else
        {
            std::cout << "[alarms] WS listening on ws://0.0.0.0:" << wsPort << "\n";
        }
    }

    const std::string wsUrl = "ws://" + opcbridgeHost + ":" + std::to_string(opcbridgeWsPort) + "/?client=opcbridge-alarms";
    std::cout << "[alarms] opcbridge WS: " << wsUrl << "\n";
    std::cout << "[alarms] opcbridge HTTP: http://" << opcbridgeHost << ":" << opcbridgeHttpPort << "\n";
    {
        const auto keys = engine.subscription_keys();
        std::cout << "[alarms] Rules loaded from " << (rulesFromOpcbridge.load() ? "opcbridge" : "local file/example")
                  << " (" << keys.size() << " subscription key(s))\n";
    }

    const int64_t startMs = now_ms();
    std::atomic<bool> stop{false};
    std::atomic<uint64_t> subscriptionGeneration{1};
    std::thread wsThread([&]() { ws_client_loop(stop, engine, wsUrl, opcbridgeHost, opcbridgeHttpPort, subscriptionGeneration); });

    std::thread configThread([&]() {
        if (adminToken.empty()) return;
        while (!stop.load())
        {
            std::this_thread::sleep_for(std::chrono::seconds(5));
            std::string err;
            const int64_t prev = engine.last_config_mtime_ms.load();
            if (!fetch_rules_from_opcbridge(engine, opcbridgeHost, opcbridgeHttpPort, adminToken, configDir, err)) {
                continue;
            }
            if (!rulesFromOpcbridge.load()) {
                rulesFromOpcbridge.store(true);
                std::cout << "[alarms] Now loading rules from opcbridge\n";
            }
            const int64_t next = engine.last_config_mtime_ms.load();
            if (next != prev) {
                subscriptionGeneration.fetch_add(1);
                std::cout << "[alarms] Reloaded alarms.json from opcbridge (mtime change)\n";
                const int64_t since = now_ms() - (14LL * 24LL * 60LL * 60LL * 1000LL);
                engine.restore_state_from_db(since);
            }
        }
    });

    std::thread pendingThread([&]() {
        while (!stop.load()) {
            engine.process_pending_activations();
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    });

    httplib::Server svr;

    svr.Get("/alarm/api/status", [&](const httplib::Request &, httplib::Response &res) {
        int active = 0, unacked = 0, shelved = 0, disabled = 0;
        engine.counts(active, unacked, shelved, disabled);
        const auto keys = engine.subscription_keys();
        const int64_t now = now_ms();
        const int64_t lastTag = engine.last_tag_update_ms.load();
        const int64_t staleThresholdMs = 30000;
        const bool feedStale = lastTag > 0 && (now - lastTag) > staleThresholdMs;

	        json j;
	        j["ok"] = true;
	        j["service"] = "opcbridge-alarms";
	        j["version"] = OPCBRIDGE_ALARMS_VERSION; // backward compat
	        j["component_version"] = OPCBRIDGE_ALARMS_VERSION;
	        j["suite_version"] = OPCBRIDGE_SUITE_VERSION;
	        j["uptime_ms"] = now_ms() - startMs;
        j["db"] = db.status_json();
        j["opcbridge"] = {
            {"connected", engine.opcbridge_ws_connected.load()},
            {"base_url", "http://" + opcbridgeHost + ":" + std::to_string(opcbridgeHttpPort)},
            {"ws_connected", engine.opcbridge_ws_connected.load()},
            {"baselining", engine.opcbridge_baselining.load()},
            {"suppress_events_until_ms", engine.suppress_events_until_ms.load()},
            {"last_tag_update_ms", lastTag},
            {"feed_stale", feedStale},
            {"feed_stale_threshold_ms", staleThresholdMs},
            {"ws_last_open_ms", engine.opcbridge_ws_last_open_ms.load()},
            {"ws_last_close_ms", engine.opcbridge_ws_last_close_ms.load()},
            {"ws_last_error_ms", engine.opcbridge_ws_last_error_ms.load()},
            {"ws_last_message_ms", engine.opcbridge_ws_last_message_ms.load()},
            {"ws_open_count", engine.opcbridge_ws_open_count.load()},
            {"ws_close_count", engine.opcbridge_ws_close_count.load()},
            {"ws_error_count", engine.opcbridge_ws_error_count.load()}
        };
        j["config"] = {
            {"rules_source", rulesFromOpcbridge.load() ? "opcbridge" : "local"},
            {"opcbridge_alarms_mtime_ms", engine.last_config_mtime_ms.load()},
            {"subscription_key_count", static_cast<int>(keys.size())}
        };
        {
            json sample = json::array();
            for (size_t i = 0; i < keys.size() && i < 10; i++) sample.push_back(keys[i]);
            j["config"]["subscription_keys_sample"] = sample;
        }
        j["last_alarm_change_ms"] = engine.last_alarm_change_ms.load();
        j["ws"] = {
            {"enabled", wsServer.enabled.load()},
            {"port", static_cast<int>(wsPort)},
            {"clients", static_cast<int>(wsServer.clients.load())}
        };
        j["opcua"] = {
            {"enabled", uaServer.enabled.load()},
            {"port", static_cast<int>(opcuaPort)},
            {"endpoint", std::string("opc.tcp://0.0.0.0:") + std::to_string(opcuaPort)}
        };
        j["notifications"] = notifications.status_json();
        j["counts"] = {
            {"active", active},
            {"unacked", unacked},
            {"shelved", shelved},
            {"disabled", disabled}
        };
        res.set_content(j.dump(2), "application/json");
    });

	    svr.Get("/alarm/api/notifications/log", [&](const httplib::Request &req, httplib::Response &res) {
	        int limit = 200;
	        if (req.has_param("limit"))
	        {
	            try { limit = std::stoi(req.get_param_value("limit")); } catch (...) { limit = 200; }
	        }
	        json j;
	        j["ok"] = true;
	        j["log"] = notifications.escalation_log_json(limit);
	        res.set_content(j.dump(2), "application/json");
	    });

    svr.Get("/alarm/api/alarms/active", [&](const httplib::Request &req, httplib::Response &res) {
        const bool only_unacked = req.has_param("only_unacked") && req.get_param_value("only_unacked") == "true";
        json j;
        j["ok"] = true;
        j["alarms"] = engine.get_active(only_unacked);
        res.set_content(j.dump(2), "application/json");
    });

    svr.Get("/alarm/api/alarms/all", [&](const httplib::Request &, httplib::Response &res) {
        json out = json::array();
        {
            std::lock_guard<std::mutex> lock(engine.mu);
            for (const auto &kv : engine.states)
            {
                json row = alarm_state_to_json(kv.second);
                const std::string resolved = notifications.resolve_policy_for_alarm(kv.second);
                row["resolved_notification_policy"] = resolved.empty() ? nullptr : json(resolved);
                out.push_back(std::move(row));
            }
        }
        json j;
        j["ok"] = true;
        j["alarms"] = out;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Get("/alarm/api/alarms/history", [&](const httplib::Request &req, httplib::Response &res) {
        json events;
        std::string err;
        bool ok = db.fetch_events(req, events, err);
        if (ok && events.is_array())
        {
            json filtered = json::array();
            for (const auto& ev : events)
            {
                std::string note = json_string_or_empty(ev, "note");
                std::string actor = json_string_or_empty(ev, "actor");
                std::transform(note.begin(), note.end(), note.begin(), [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
                std::transform(actor.begin(), actor.end(), actor.begin(), [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
                if (actor == "opcbridge-alarms" && note.find("startup/reconnect reconciliation") != std::string::npos) continue;
                if (note.find("inferred from current tag state") != std::string::npos) continue;
                filtered.push_back(ev);
            }
            events = std::move(filtered);
        }
        json j;
        j["ok"] = ok;
        if (!ok) j["error"] = err;
        j["events"] = events;
        if (ok && events.is_array() && !events.empty()) {
            // For paging backwards (older events), request again with until_ms=next_until_ms.
            try {
                int64_t oldest = events[0]["ts_ms"].get<int64_t>();
                for (const auto& ev : events) {
                    if (ev.contains("ts_ms") && ev["ts_ms"].is_number_integer()) {
                        int64_t t = ev["ts_ms"].get<int64_t>();
                        if (t < oldest) oldest = t;
                    }
                }
                j["next_until_ms"] = oldest - 1;
            } catch (...) {}
        }
        res.status = ok ? 200 : 500;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Get("/alarm/api/alarms/panel", [&](const httplib::Request &req, httplib::Response &res) {
        json events;
        std::string err;
        bool ok = db.fetch_events(req, events, err);
        auto should_skip_event = [](const json& ev) {
            std::string note = json_string_or_empty(ev, "note");
            std::string actor = json_string_or_empty(ev, "actor");
            std::transform(note.begin(), note.end(), note.begin(), [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
            std::transform(actor.begin(), actor.end(), actor.begin(), [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
            if (actor == "opcbridge-alarms" && note.find("startup/reconnect reconciliation") != std::string::npos) return true;
            if (note.find("inferred from current tag state") != std::string::npos) return true;
            return false;
        };

        int rowLimit = 500;
        if (req.has_param("rows"))
        {
            try { rowLimit = std::stoi(req.get_param_value("rows")); } catch (...) {}
        }
        else if (req.has_param("limit"))
        {
            try { rowLimit = std::stoi(req.get_param_value("limit")); } catch (...) {}
        }
        rowLimit = std::max(1, std::min(2000, rowLimit));

        json rows = json::array();
        if (ok)
        {
            std::vector<json> ordered;
            if (events.is_array())
            {
                for (const auto& ev : events)
                {
                    if (!ev.is_object() || should_skip_event(ev)) continue;
                    ordered.push_back(ev);
                }
            }
            std::sort(ordered.begin(), ordered.end(), [](const json& a, const json& b) {
                return a.value("ts_ms", 0LL) < b.value("ts_ms", 0LL);
            });

            std::unordered_map<std::string, json> rowsByKey;
            std::unordered_map<std::string, std::string> openKeyByAlarmId;
            for (const auto& ev : ordered)
            {
                const std::string id = ev.value("alarm_id", "");
                const std::string type = ev.value("type", "");
                const int64_t ts = ev.value("ts_ms", 0LL);
                if (id.empty() || ts <= 0) continue;

                std::string loweredType = type;
                std::transform(loweredType.begin(), loweredType.end(), loweredType.begin(), [](unsigned char ch) { return static_cast<char>(std::tolower(ch)); });
                const bool isReturn = loweredType == "return" || loweredType == "reset" || loweredType == "clear";
                std::string key;
                if (loweredType == "active")
                {
                    const auto openIt = openKeyByAlarmId.find(id);
                    if (openIt != openKeyByAlarmId.end())
                    {
                        continue;
                    }
                    key = "event:" + id + ":" + std::to_string(ts);
                }
                else if (isReturn)
                {
                    const auto openIt = openKeyByAlarmId.find(id);
                    key = openIt == openKeyByAlarmId.end() ? ("event:" + id + ":return:" + std::to_string(ts)) : openIt->second;
                }
                else
                {
                    const auto openIt = openKeyByAlarmId.find(id);
                    if (openIt == openKeyByAlarmId.end()) continue;
                    key = openIt->second;
                }

                json row = rowsByKey.count(key) ? rowsByKey[key] : json::object();
                row["timeline_key"] = key;
                row["alarm_id"] = id;
                row["source"] = ev.contains("source") ? ev["source"] : json::object();
                if (ev.contains("group")) row["group"] = ev["group"];
                if (ev.contains("site")) row["site"] = ev["site"];
                if (ev.contains("severity")) row["severity"] = ev["severity"];
                if (ev.contains("message")) row["message"] = ev["message"];
                row["history_event"] = true;
                row["last_event_type"] = loweredType.empty() ? "event" : loweredType;
                row["last_event_ts_ms"] = ts;
                if (ev.contains("value")) row["last_event_value"] = ev["value"];
                if (loweredType == "active")
                {
                    row["active"] = true;
                    row["active_since_ms"] = ts;
                    row["cleared_ts_ms"] = 0;
                    openKeyByAlarmId[id] = key;
                }
                else if (isReturn)
                {
                    row["active"] = false;
                    row["cleared_ts_ms"] = ts;
                    openKeyByAlarmId.erase(id);
                }
                rowsByKey[key] = std::move(row);
            }

            std::unordered_set<std::string> representedActiveIds;
            for (const auto& kv : rowsByKey)
            {
                const json& row = kv.second;
                if (row.value("active", false) && row.value("cleared_ts_ms", 0LL) <= 0)
                {
                    representedActiveIds.insert(row.value("alarm_id", ""));
                }
            }

            {
                std::lock_guard<std::mutex> lock(engine.mu);
                for (const auto& kv : engine.states)
                {
                    const AlarmState& s = kv.second;
                    if (!s.active || representedActiveIds.count(s.alarm_id)) continue;
                    if (!s.return_notification_armed) continue;
                    json row = alarm_state_to_json(s);
                    row["timeline_key"] = "state:" + s.alarm_id;
                    row["last_event_type"] = "active";
                    row["last_event_ts_ms"] = s.active_since_ms > 0 ? s.active_since_ms : (s.last_change_ms > 0 ? s.last_change_ms : now_ms());
                    row["cleared_ts_ms"] = 0;
                    rowsByKey[row["timeline_key"].get<std::string>()] = std::move(row);
                }
            }

            std::vector<json> sortedRows;
            sortedRows.reserve(rowsByKey.size());
            for (auto& kv : rowsByKey) sortedRows.push_back(std::move(kv.second));
            std::sort(sortedRows.begin(), sortedRows.end(), [](const json& a, const json& b) {
                const int64_t ta = a.value("last_event_ts_ms", a.value("active_since_ms", 0LL));
                const int64_t tb = b.value("last_event_ts_ms", b.value("active_since_ms", 0LL));
                if (tb != ta) return tb < ta;
                return a.value("alarm_id", std::string()) < b.value("alarm_id", std::string());
            });
            for (const auto& row : sortedRows)
            {
                if (static_cast<int>(rows.size()) >= rowLimit) break;
                rows.push_back(row);
            }
        }

        json j;
        j["ok"] = ok;
        if (!ok) j["error"] = err;
        j["rows"] = rows;
        res.status = ok ? 200 : 500;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post("/alarm/api/voice-modem/test", [&](const httplib::Request &req, httplib::Response &res) {
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }

        NotificationManager::TestCallRequest test;
        test.contact_id = body.value("contact_id", "test");
        test.contact_name = body.value("contact_name", "Test Call");
        test.phone = body.value("phone", "");
        test.audio_file = body.value("audio_file", "");
        test.tts_text = body.value("tts_text", "");

        json j;
        if (test.phone.empty())
        {
            res.status = 400;
            j["ok"] = false;
            j["error"] = "Phone number is required.";
            res.set_content(j.dump(2), "application/json");
            return;
        }

        std::string result;
        const bool ok = notifications.test_voice_modem_call(test, result);
        res.status = ok ? 200 : 500;
        j["ok"] = ok;
        j["result"] = result;
        if (!ok) j["error"] = result.empty() ? "Voice modem test call failed." : result;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post("/alarm/api/audio/test", [&](const httplib::Request &req, httplib::Response &res) {
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }
        const std::string audio_file = body.value("audio_file", "");
        const std::string tts_text = body.value("tts_text", "");
        const std::string output_device = body.value("output_device", "");

        json j;
        std::string result;
        const bool ok = notifications.test_audio_playback(audio_file, tts_text, output_device, result);
        res.status = ok ? 200 : 500;
        j["ok"] = ok;
        j["result"] = result;
        if (!ok) j["error"] = result.empty() ? "Audio test failed." : result;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post("/alarm/api/email/test", [&](const httplib::Request &req, httplib::Response &res) {
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }
        std::string to = body.value("to", "");
        json j;
        if (to.empty())
        {
            res.status = 400;
            j["ok"] = false;
            j["error"] = "Test recipient is required.";
            res.set_content(j.dump(2), "application/json");
            return;
        }
        std::string result;
        const bool ok = notifications.test_email(to, result);
        res.status = ok ? 200 : 500;
        j["ok"] = ok;
        j["result"] = result;
        if (!ok) j["error"] = result.empty() ? "Email test failed." : result;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post("/alarm/api/sip/test", [&](const httplib::Request &req, httplib::Response &res) {
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }

	        const std::string to = body.value("to", "");
	        const std::string audio_file = body.value("audio_file", "");
	        const std::string tts_text = body.value("tts_text", "");
	        const std::string transportOverride = body.value("transport", "");
	        const int durationOverride = body.contains("duration") ? body.value("duration", 0) : 0;
	        const int ackWaitOverride = body.contains("ack_wait_sec") ? body.value("ack_wait_sec", 0) : 0;
	        std::string net_if = body.value("net_if", "");
	        std::vector<std::string> ack_dtmf;
	        if (body.contains("ack_dtmf"))
	        {
	            try
	            {
	                if (body["ack_dtmf"].is_array())
	                {
	                    for (const auto& v : body["ack_dtmf"])
	                    {
	                        if (!v.is_string()) continue;
	                        const std::string s = v.get<std::string>();
	                        if (s.size() == 1) ack_dtmf.push_back(s);
	                    }
	                }
	                else if (body["ack_dtmf"].is_string())
	                {
	                    const std::string s = body["ack_dtmf"].get<std::string>();
	                    if (s.size() == 1) ack_dtmf.push_back(s);
	                }
	            } catch (...) {}
	        }

	        json j;
	        j["ok"] = false;

	        const NotificationManager::SipConfig sipCfg = notifications.sip_config_copy();
	        std::string effectiveTo = to;
	        if (effectiveTo.empty() && !sipCfg.test_to.empty()) effectiveTo = sipCfg.test_to;
	        if (effectiveTo.empty())
	        {
	            res.status = 400;
	            j["error"] = "Missing required field: to";
	            res.set_content(j.dump(2), "application/json");
	            return;
	        }

	        // Allow explicit overrides for ad-hoc testing if provided.
        const std::string server = body.value("server", sipCfg.server);
        const std::string ext = body.value("ext", sipCfg.ext);
        const std::string pass = body.value("pass", sipCfg.pass);
        const std::string transport = transportOverride.empty() ? (sipCfg.transport.empty() ? "udp" : sipCfg.transport) : transportOverride;
        const int duration = durationOverride > 0 ? std::max(5, std::min(300, durationOverride)) : std::max(5, std::min(300, sipCfg.duration_sec));
        const int ack_wait_sec = ackWaitOverride > 0 ? std::max(1, std::min(600, ackWaitOverride)) : 0;

        if (server.empty() || ext.empty() || pass.empty())
        {
            res.status = 500;
            j["error"] = "SIP is not configured (missing server/ext/pass). Configure SIP Settings first.";
            res.set_content(j.dump(2), "application/json");
            return;
        }

        std::string host = server;
        std::string port = "5060";
        const auto colon = server.find(':');
        if (colon != std::string::npos)
        {
            host = server.substr(0, colon);
            port = server.substr(colon + 1);
            if (host.empty()) host = server;
            if (port.empty()) port = "5060";
        }

        if (net_if.empty())
        {
            net_if = !sipCfg.net_if.empty() ? sipCfg.net_if : detect_route_interface_for_host(host);
        }

        const std::filesystem::path tmpdir = std::filesystem::path("/tmp") / ("opcbridge-siptest-" + random_hex(8));
        std::error_code ec;
        std::filesystem::create_directories(tmpdir, ec);
        if (ec)
        {
            res.status = 500;
            j["error"] = "Failed to create temp dir: " + ec.message();
            res.set_content(j.dump(2), "application/json");
            return;
        }

	        std::string effectiveAudioFile = audio_file.empty() ? sipCfg.test_audio_file : audio_file;
	        std::string effectiveTtsText = tts_text.empty() ? sipCfg.test_tts_text : tts_text;

	        std::string wav_path;
	        if (!effectiveAudioFile.empty())
	        {
	            wav_path = notifications.audio_path_for_id_copy(effectiveAudioFile);
	            if (wav_path.empty())
	            {
	                res.status = 400;
	                j["error"] = "Unknown audio_file id: " + effectiveAudioFile;
	                res.set_content(j.dump(2), "application/json");
	                return;
	            }
	        }
	        else if (std::any_of(effectiveTtsText.begin(), effectiveTtsText.end(), [](unsigned char c) { return !std::isspace(c); }))
	        {
	            std::string err;
	            if (!notifications.generate_tts_wav_public(effectiveTtsText, wav_path, err))
	            {
	                res.status = 500;
	                j["error"] = err.empty() ? "Failed to generate TTS wav." : err;
	                res.set_content(j.dump(2), "application/json");
	                return;
	            }
	        }
        // Stage wav into tmpdir (avoid permission issues and allow temp cleanup).
        if (!wav_path.empty())
        {
            const std::string staged = (tmpdir / "sip-audio.wav").string();
            std::string copyErr;
            if (!copy_file_best_effort(wav_path, staged, copyErr))
            {
                res.status = 500;
                j["error"] = "Failed to stage wav for SIP test: " + (copyErr.empty() ? "copy failed" : copyErr);
                res.set_content(j.dump(2), "application/json");
                std::filesystem::remove_all(tmpdir, ec);
                return;
            }
            wav_path = staged;
        }

        // Create a small silence wav that can be looped as RTP keepalive (prevents PBX from dropping the call
        // immediately after message audio ends).
        {
            std::string serr;
            const std::string silencePath = (tmpdir / "sip-silence.wav").string();
            write_silence_wav_48k_mono16(silencePath, 1000, serr);
        }

	        std::string dest = effectiveTo;
        if (dest.rfind("sip:", 0) != 0)
        {
            dest = "sip:" + dest + "@" + host + ":" + port;
        }

	        PjsuaRunResult rr;
	        bool used_pjsua2 = false;
#if defined(OPCBRIDGE_HAVE_PJSUA2)
	        if (sipCfg.use_pjsua2)
	        {
	            used_pjsua2 = true;
	            const std::string ackConfirmAudioFile = body.value("ack_confirm_audio_file", sipCfg.ack_confirm_audio_file);
	            const std::string ackConfirmTtsText = body.value("ack_confirm_tts_text", sipCfg.ack_confirm_tts_text);
	            const int ackConfirmMaxMs = body.contains("ack_confirm_max_ms")
	                ? std::max(0, std::min(30000, body.value("ack_confirm_max_ms", sipCfg.ack_confirm_max_ms)))
	                : sipCfg.ack_confirm_max_ms;

	            std::string ack_confirm_wav_path;
	            if (!ackConfirmAudioFile.empty())
	            {
	                ack_confirm_wav_path = notifications.audio_path_for_id_copy(ackConfirmAudioFile);
	                if (ack_confirm_wav_path.empty())
	                {
	                    res.status = 400;
	                    j["error"] = "Unknown ack_confirm_audio_file id: " + ackConfirmAudioFile;
	                    res.set_content(j.dump(2), "application/json");
	                    return;
	                }
	            }
	            else if (std::any_of(ackConfirmTtsText.begin(), ackConfirmTtsText.end(), [](unsigned char c) { return !std::isspace(c); }))
	            {
	                std::string err;
	                if (!notifications.generate_tts_wav_public(ackConfirmTtsText, ack_confirm_wav_path, err))
	                {
	                    res.status = 500;
	                    j["error"] = err.empty() ? "Failed to generate ack confirmation TTS wav." : err;
	                    res.set_content(j.dump(2), "application/json");
	                    return;
	                }
	            }
	            if (!ack_confirm_wav_path.empty())
	            {
	                const std::string staged = (tmpdir / "sip-ack-confirm.wav").string();
	                std::string copyErr;
	                if (!copy_file_best_effort(ack_confirm_wav_path, staged, copyErr))
	                {
	                    res.status = 500;
	                    j["error"] = "Failed to stage ACK confirm wav for SIP test: " + (copyErr.empty() ? "copy failed" : copyErr);
	                    res.set_content(j.dump(2), "application/json");
	                    return;
	                }
	                ack_confirm_wav_path = staged;
	            }

	            pjsua2_run_call_with_file(
	                host,
	                port,
	                ext,
	                pass,
	                transport,
	                net_if,
	                dest,
	                wav_path,
	                ack_confirm_wav_path,
	                (tmpdir / "sip-silence.wav").string(),
	                ackConfirmMaxMs,
	                duration,
	                30,
	                ack_wait_sec,
	                ack_dtmf,
	                rr
	            );
	        }
#endif

        const std::string pjsuaPath = "/opt/opcbridge-suite/bin/pjsua";
        if ((!used_pjsua2 || rr.exit_code != 0 || (!wav_path.empty() && !rr.file_connected_to_call)) && command_exists(pjsuaPath))
        {
            if (used_pjsua2 && (rr.exit_code != 0 || (!wav_path.empty() && !rr.file_connected_to_call)))
            {
                std::cout << "[alarms][sip] PJSUA2 test call failed; falling back to pjsua CLI\n";
            }
            used_pjsua2 = false;
            pjsua_run_call_with_file(
                pjsuaPath,
                host,
                port,
                ext,
                pass,
                transport,
                net_if,
                dest,
                wav_path,
                duration,
                30,
                ack_wait_sec,
                ack_dtmf,
                rr
            );
        }

        if (!used_pjsua2 && rr.exit_code < 0 && !command_exists(pjsuaPath))
        {
            res.status = 500;
            j["error"] = "No SIP dialer available. Install pjproject (--deps or --with-pjsip).";
            res.set_content(j.dump(2), "application/json");
            std::filesystem::remove_all(tmpdir, ec);
            return;
        }

        // pjsua output format differs from baresip, so use pjsua-parsed fields.
        const std::vector<int> inviteCodes = rr.invite_codes;
        const std::vector<int> registerCodes = rr.register_codes;

        j["exit_code"] = rr.exit_code;
        j["net_if"] = net_if;
        j["dest"] = dest;
        j["duration"] = duration;
        j["ack_wait_sec"] = ack_wait_sec;
        j["ack_dtmf"] = ack_dtmf;
        j["elapsed_ms"] = rr.elapsed_ms;
        j["answered_offset_ms"] = rr.answered_offset_ms;
        j["stop_reason"] = rr.stop_reason;
        j["acked_dtmf"] = rr.acked_dtmf;
        j["transport"] = transport;
        j["codes"] = inviteCodes;
        j["register_codes"] = registerCodes;
        const bool inviteAnswered = rr.invite_answered || std::find(inviteCodes.begin(), inviteCodes.end(), 200) != inviteCodes.end();
        const bool inviteRinging =
            rr.invite_ringing ||
            std::find(inviteCodes.begin(), inviteCodes.end(), 180) != inviteCodes.end() ||
            std::find(inviteCodes.begin(), inviteCodes.end(), 183) != inviteCodes.end();
        j["invite_answered"] = inviteAnswered;
        j["invite_ringing"] = inviteRinging;
        j["ring_timeout_sec"] = 15;
        j["bye_tx"] = rr.bye_tx;
        j["bye_rx"] = rr.bye_rx;
        j["cancel_tx"] = rr.cancel_tx;
        j["cancel_rx"] = rr.cancel_rx;
        j["file_port"] = rr.file_port;
        j["call_port"] = rr.call_port;
        j["file_connected_to_call"] = rr.file_connected_to_call;

        const bool hasProgress = std::any_of(inviteCodes.begin(), inviteCodes.end(), [](int c) { return c >= 100 && c <= 199; });
        const bool hasSuccess =
            std::find(inviteCodes.begin(), inviteCodes.end(), 200) != inviteCodes.end() ||
            std::find(inviteCodes.begin(), inviteCodes.end(), 180) != inviteCodes.end() ||
            std::find(inviteCodes.begin(), inviteCodes.end(), 183) != inviteCodes.end();
        bool hasFatal = false;
        for (const int c : inviteCodes)
        {
            if (c == 401 || c == 407) continue;
            if (c >= 400) hasFatal = true;
        }
        const bool ok = (hasSuccess || hasProgress) && !hasFatal;

        j["ok"] = ok;
        if (!ok)
        {
            j["error"] = inviteCodes.empty()
                ? "No SIP responses detected. Check VPN routing/firewall and bind interface."
                : "SIP call did not succeed. Check response codes.";
        }

        const int64_t holdMs = (rr.answered_offset_ms >= 0 && rr.elapsed_ms >= rr.answered_offset_ms) ? (rr.elapsed_ms - rr.answered_offset_ms) : -1;
        j["hold_ms"] = holdMs;
        // duration is a max call cap. For SIP tests, the expected call hold time is driven by audio length:
        // - no ACK: play audio once, then hang up
        // - ACK: keep the call up until audio finishes + ack_wait_sec (timer starts after audio)
        const int64_t maxHoldMs = static_cast<int64_t>(duration) * 1000;
        const int64_t msgMs = wav_path.empty() ? 0 : std::max<int64_t>(0, wav_pcm_duration_ms(wav_path));
        const bool ackRequired = ack_wait_sec > 0 && !ack_dtmf.empty();
        int64_t expectedHoldMs = msgMs + (ackRequired ? static_cast<int64_t>(ack_wait_sec) * 1000 : 0);
        if (expectedHoldMs <= 0) expectedHoldMs = maxHoldMs;
        if (expectedHoldMs > maxHoldMs) expectedHoldMs = maxHoldMs;
        j["expected_hold_ms"] = expectedHoldMs;
        j["audio_file"] = effectiveAudioFile;
        j["tts_text"] = effectiveTtsText;
        j["wav_path"] = wav_path;
        j["tmpdir"] = tmpdir.string();

        // Provide a short tail for UI troubleshooting (even if empty, return an empty string).
        {
            const size_t keep = std::min<size_t>(20000, rr.log.size());
            j["log_tail"] = rr.log.empty() ? "" : rr.log.substr(rr.log.size() - keep);
        }
        if (!rr.log.empty())
        {
            try
            {
                std::ofstream dbg(tmpdir / "sip-debug.log", std::ios::binary | std::ios::trunc);
                dbg << rr.log;
            }
            catch (...) {}
        }

        // For test calls, treat "answered but didn't stay up for expected time" as failure.
        if (inviteAnswered && holdMs >= 0 && holdMs < (expectedHoldMs - 500))
        {
            j["ok"] = false;
            j["error"] = "Call answered but ended early (before expected time).";
            res.status = 500;
        }
        else
        {
            res.status = ok ? 200 : 500;
        }
        res.set_content(j.dump(2), "application/json");

        // Keep tmpdir for SIP test calls to aid audio/media debugging.
        j["kept_tmpdir"] = true;
    });

    svr.Post(R"(/alarm/api/alarms/([A-Za-z0-9_.:-]+)/ack)", [&](const httplib::Request &req, httplib::Response &res) {
        const std::string alarm_id = req.matches.size() > 1 ? req.matches[1].str() : "";
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }
        const std::string actor = body.value("actor", "");
        const std::string note = body.value("note", "");
        json j;
        if (alarm_id.empty() || !engine.ack(alarm_id, actor, note))
        {
            res.status = 404;
            j["ok"] = false;
            j["error"] = "Unknown alarm id.";
            res.set_content(j.dump(2), "application/json");
            return;
        }
        j["ok"] = true;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post(R"(/alarm/api/alarms/([A-Za-z0-9_.:-]+)/shelve)", [&](const httplib::Request &req, httplib::Response &res) {
        const std::string alarm_id = req.matches.size() > 1 ? req.matches[1].str() : "";
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }
        const std::string actor = body.value("actor", "");
        const std::string note = body.value("note", "");
        int64_t until = 0;
        if (body.contains("until_ms") && body["until_ms"].is_number_integer())
            until = body["until_ms"].get<int64_t>();
        else if (body.contains("duration_ms") && body["duration_ms"].is_number_integer())
            until = now_ms() + body["duration_ms"].get<int64_t>();

        json j;
        if (alarm_id.empty() || until <= 0 || !engine.shelve(alarm_id, until, actor, note))
        {
            res.status = 400;
            j["ok"] = false;
            j["error"] = "Invalid alarm id or duration.";
            res.set_content(j.dump(2), "application/json");
            return;
        }
        j["ok"] = true;
        j["shelved_until_ms"] = until;
        res.set_content(j.dump(2), "application/json");
    });

    svr.Post(R"(/alarm/api/alarms/([A-Za-z0-9_.:-]+)/unshelve)", [&](const httplib::Request &req, httplib::Response &res) {
        const std::string alarm_id = req.matches.size() > 1 ? req.matches[1].str() : "";
        json body;
        try { body = json::parse(req.body); } catch (...) { body = json::object(); }
        const std::string actor = body.value("actor", "");
        const std::string note = body.value("note", "");
        json j;
        if (alarm_id.empty() || !engine.unshelve(alarm_id, actor, note))
        {
            res.status = 404;
            j["ok"] = false;
            j["error"] = "Unknown alarm id.";
            res.set_content(j.dump(2), "application/json");
            return;
        }
        j["ok"] = true;
        res.set_content(j.dump(2), "application/json");
    });

    std::cout << "[alarms] HTTP listening on http://0.0.0.0:" << httpPort << "\n";
    svr.listen("0.0.0.0", httpPort);

    stop.store(true);
    if (wsThread.joinable()) wsThread.join();
    if (configThread.joinable()) configThread.join();
    if (pendingThread.joinable()) pendingThread.join();
    notifications.stop();
    wsServer.stop();
    uaServer.stop();
    db.close();
    return 0;
}
