#include "ethernetip_recovery.h"

#include <cassert>

int main() {
    using namespace std::chrono_literals;
    const auto start = EthernetIpRecovery::Clock::now();
    EthernetIpRecovery b180;
    EthernetIpRecovery healthy;
    assert(!b180.observe(12, 0, start));
    for (int seconds = 0; seconds <= 30; ++seconds) {
        assert(b180.observe(12, seconds + 1, start + seconds * 1s) == (seconds == 30));
        assert(!healthy.observe(seconds + 1, seconds + 1, start + seconds * 1s));
    }
    b180.recoveredTransport(start + 30s);
    for (int seconds = 31; seconds <= 150; ++seconds) {
        assert(b180.observe(12, seconds + 1, start + seconds * 1s) == (seconds == 150));
    }
    assert(!b180.observe(13, 152, start + 151s));
    assert(!b180.observe(13, 153, start + 152s));
    assert(!b180.observe(13, 153, start + 184s));
    assert(!b180.observe(13, 154, start + 185s));
    assert(!b180.observe(0, 0, start + 186s));
    assert(!b180.observe(0, 1, start + 187s));
}
