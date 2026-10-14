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

    ModbusConnectionRecovery connection;
    assert(!connection.observe(1, 0, now));
    assert(!connection.observe(1, 1, now));
    assert(!connection.observe(1, 2, now + std::chrono::seconds(29)));
    assert(connection.observe(1, 3, now + std::chrono::seconds(30)));
    connection.reset(now + std::chrono::seconds(30));
    assert(!connection.observe(1, 4, now + std::chrono::seconds(31)));
    assert(!connection.observe(1, 5, now + std::chrono::seconds(60)));
    assert(connection.observe(1, 5, now + std::chrono::seconds(61)));
    // A successful read from any lane prevents reset for a bad register.
    assert(!connection.observe(2, 6, now + std::chrono::seconds(62)));
    assert(!connection.observe(3, 7, now + std::chrono::seconds(100)));
    // Metric replacement on configuration reload must discard old failure state.
    assert(!connection.observe(0, 0, now + std::chrono::seconds(101)));
    assert(!connection.observe(0, 1, now + std::chrono::seconds(102)));
    assert(!connection.observe(0, 1, now + std::chrono::seconds(131)));
    assert(connection.observe(0, 1, now + std::chrono::seconds(132)));
    ModbusConnectionRecovery otherConnection;
    assert(!otherConnection.observe(10, 0, now + std::chrono::seconds(132)));
}
