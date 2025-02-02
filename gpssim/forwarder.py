import re
import time
import serial
import wmi
import threading
import pythoncom


# Function to monitor for COM port device arrival
def monitor_com_ports():
    print("HELLOOOOO")
    pythoncom.CoInitialize()
    print("HELLOOOOO")
    # Create a WMI object to interact with Windows Management Instrumentation
    c = wmi.WMI()
    print("HELLOOOOO")
    # Query for existing COM ports
    com_ports = []
    for port in c.query("SELECT * FROM Win32_PnPEntity WHERE DeviceID LIKE 'FTDIBUS%'"):
        # TODO: Use these to read data too
        com_ports.append(port)
        on_com_port_added(port)

    print("Initial COM ports: ", com_ports)

    # Monitor for changes in COM ports (using WMI event subscription)
    create_watcher = c.watch_for(
        notification_type="creation",
        # action=lambda obj: on_com_port_added(obj),
        wmi_class="Win32_PnPEntity",
    )

    print("one")

    delete_watcher = c.watch_for(
        notification_type="deletion",
        # action=lambda obj: on_com_port_added(obj),
        wmi_class="Win32_PnPEntity",
    )

    print("two")

    # Keep the thread running to listen for changes
    while True:
        try:
            added_device = create_watcher(500)
        except wmi.x_wmi_timed_out:
            pythoncom.PumpWaitingMessages()
        else:
            print(added_device)
            if added_device.DeviceID.startswith("FTDIBUS"):
                on_com_port_added(added_device)

        # TODO: Use this!
        # try:
        #     warning_log = delete_watcher(500)
        # except wmi.x_wmi_timed_out:
        #     pythoncom.PumpWaitingMessages()
        #     print("no delete")
        # else:
        #     print(warning_log)

        time.sleep(1)


def on_com_port_added(obj):
    # When a new COM port is added, this function is called
    m = re.match(r".*(COM\d+)", obj.Name)

    if m:
        com_port_name = m.group(1).lower()
        print(f"New COM port detected: {com_port_name}")

        # Open and read from the new COM port
        open_and_read_com_port(com_port_name)


def open_and_read_com_port(com_port):
    try:
        # Open the serial port
        ser = serial.Serial(com_port, 9600, timeout=1)  # Adjust settings as needed
        print(f"Successfully opened {com_port}. Now reading data...")

        buffer = ""

        while True:
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting)
                decoded_data = data.decode('utf-8', errors='ignore')
                print(f"Data read: {decoded_data}")
                import socket
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)  # UDP

                decoded_lines = decoded_data.splitlines(keepends=True)

                decoded_lines[0] = buffer + decoded_lines[0]
                buffer = ""

                if decoded_lines[-1].endswith("\n"):
                    decoded_lines.append("")
                else:
                    buffer += decoded_lines[-1]

                for line in decoded_lines[:-1]:
                    print(f"LINE: {line}")
                    sock.sendto(line.encode(), ("127.0.0.1", 5577))
            time.sleep(1)
    except serial.SerialException as e:
        print(f"Error opening {com_port}: {e}")
        return


def start_monitoring():
    # Start the thread to monitor COM port changes
    monitor_thread = threading.Thread(target=monitor_com_ports, daemon=True)
    monitor_thread.start()

    # Keep the program running to listen for notifications
    while True:
        time.sleep(1)


if __name__ == "__main__":
    start_monitoring()
