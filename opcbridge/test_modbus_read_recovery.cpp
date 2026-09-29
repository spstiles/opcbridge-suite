#include "modbus_read_recovery.h"
#include <cassert>

int main() {
    ModbusReadRecovery recovery;
    const auto now = ModbusReadRecovery::Clock::now();
    assert(recovery.ready(now));
    recovery.completed(false, now);
    assert(!recovery.ready(now));
    assert(!recovery.ready(now + std::chrono::milliseconds(999)));
    assert(recovery.ready(now + std::chrono::seconds(1)));
    // Repeated failures remain retryable, rather than permanently latching.
    recovery.completed(false, now + std::chrono::seconds(1));
    assert(!recovery.ready(now + std::chrono::milliseconds(1500)));
    assert(recovery.ready(now + std::chrono::seconds(2)));
    recovery.completed(true, now + std::chrono::seconds(2));
    assert(recovery.ready(now + std::chrono::seconds(2)));
    // Another device's retry state is independent.
    ModbusReadRecovery healthy;
    recovery.completed(false, now + std::chrono::seconds(3));
    assert(healthy.ready(now + std::chrono::seconds(3)));
}
