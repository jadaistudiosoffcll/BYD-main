#!/usr/bin/env python3
import subprocess
import time
import os
import signal

print("=== BYD Horizon Club - Starting Server ===")

# Change to script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Clean database
if os.path.exists("database.sqlite"):
    os.remove("database.sqlite")
    print("Cleaned database file")

print("Starting server...")

# Start server process
process = subprocess.Popen(
    ["npx", "tsx", "server.ts"],
    stdout=open("server_out.txt", "w"),
    stderr=open("server_err.txt", "w"),
    text=True
)

print(f"Server started with PID: {process.pid}")
print("Waiting for startup...")
time.sleep(20)

# Check if server is running
if process.poll() is not None:
    print("Server process died!")
    stdout, stderr = process.communicate()
    print(f"STDOUT: {stdout}")
    print(f"STDERR: {stderr}")
    exit(1)

print("=== Server Status ===")
print("Server should be running at: http://localhost:3000")
print("Check server_out.txt for startup output")
print("Check server_err.txt for errors")

# Wait indefinitely
try:
    process.wait()
except KeyboardInterrupt:
    print("\nShutting down server...")
    process.terminate()
    process.wait()