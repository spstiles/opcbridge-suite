#!/usr/bin/env python3
"""Verify recovery from an open, unresponsive Modbus TCP socket after build.sh.

Uses two polling lanes and temporary configuration; never touches the service.
"""
import json
import pathlib
import socket
import struct
import subprocess
import tempfile
import threading
import time


def main():
    root = pathlib.Path(tempfile.mkdtemp(prefix="opcbridge-reconnect-"))
    (root / "connections").mkdir()
    (root / "tags").mkdir()
    server = socket.socket()
    server.bind(("127.0.0.1", 0))
    server.listen()
    started = time.monotonic()
    accepted = []
    replies = []

    def worker(conn, index):
        buffer = b""
        try:
            while True:
                data = conn.recv(4096)
                if not data:
                    break
                buffer += data
                while len(buffer) >= 7:
                    tid, _, length, unit = struct.unpack(">HHHB", buffer[:7])
                    if len(buffer) < 6 + length:
                        break
                    pdu = buffer[7:6 + length]
                    buffer = buffer[6 + length:]
                    # Keep the original TCP socket open but permanently silent.
                    if index == 0 and time.monotonic() - started > 4:
                        continue
                    count = struct.unpack(">H", pdu[3:5])[0]
                    response = bytes([pdu[0], 2 * count]) + struct.pack(">H", 123) * count
                    conn.sendall(struct.pack(">HHHB", tid, 0, len(response) + 1, unit) + response)
                    replies.append((index, time.monotonic() - started))
        except OSError:
            pass
        finally:
            conn.close()

    def serve():
        while True:
            try:
                conn, _ = server.accept()
            except OSError:
                return
            index = len(accepted)
            accepted.append(time.monotonic() - started)
            threading.Thread(target=worker, args=(conn, index), daemon=True).start()

    threading.Thread(target=serve, daemon=True).start()
    connection = dict(
        id="reconnect", driver="modbus_tcp",
        gateway=f"127.0.0.1:{server.getsockname()[1]}", path="1",
        default_timeout_ms=500, default_read_ms=200, poll_lanes=2,
    )
    tags = [
        dict(name=f"Reg{i}", register_type="holding_register", address=40001 + i,
             datatype="uint16", scan_ms=250, writable=True)
        for i in range(2)
    ]
    (root / "connections" / "reconnect.json").write_text(json.dumps(connection))
    (root / "tags" / "reconnect.json").write_text(
        json.dumps(dict(connection_id="reconnect", tags=tags))
    )
    binary = pathlib.Path(__file__).resolve().parents[1] / "opcbridge"
    log = root / "test.log"
    with log.open("w") as output:
        proc = subprocess.Popen(
            [str(binary), "--config", str(root)],
            stdout=output, stderr=subprocess.STDOUT, cwd=root,
        )
        try:
            deadline = time.monotonic() + 55
            while time.monotonic() < deadline:
                if proc.poll() is not None:
                    raise AssertionError(f"Bridge exited: {proc.returncode}; see {log}")
                if any(index > 0 for index, _ in replies) and "Reload OK" in log.read_text():
                    break
                time.sleep(0.25)
            else:
                raise AssertionError(f"No successful transport recovery; see {log}")
            assert "rebuilding transport" in log.read_text()
            assert len(accepted) >= 2
            assert any(index == 0 for index, _ in replies)
            assert any(index > 0 for index, _ in replies)
            print(json.dumps(dict(result="PASS", connections=accepted,
                                  successful_replies=len(replies), log=str(log))))
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()
            server.close()


if __name__ == "__main__":
    main()
