import asyncio
import websockets
import json
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
import takproto
import pytak
import socket

API_KEY = "410ed83aabd8f071b2dbfa28199d7c7f1506a650"

ship_static_data = {}

async def connect_ais_stream():

    async with websockets.connect("wss://stream.aisstream.io/v0/stream") as websocket:
        # (25, 43), L.latLng(40, 63)
        subscribe_message = {"APIKey": API_KEY,
                             "BoundingBoxes": [[[25, 43], [40, 63]]],
                            #  "FiltersShipMMSI": ["368207620", "367719770", "211476060"], # Optional!
                             "FilterMessageTypes": ["PositionReport", "ShipStaticData"]} # Optional!

        subscribe_message_json = json.dumps(subscribe_message)
        await websocket.send(subscribe_message_json)

        async for message_json in websocket:
            message = json.loads(message_json)
            message_type = message["MessageType"]

            if message_type == "ShipStaticData":
                ais_message = message['Message']['ShipStaticData']
                ship_static_data[ais_message['UserID']] = f"{ais_message["Name"].strip()} ({ais_message["CallSign"].strip()}) TO {ais_message["Destination"].strip()}"
                print(f"Found ship {ais_message["CallSign"]}: {ais_message}")
                

            if message_type == "PositionReport":
                # the message parameter contains a key of the message type which contains the message itself
                ais_message = message['Message']['PositionReport']
                # print(f"##[{datetime.now(timezone.utc)}] {ais_message}")
                # print(f"[{datetime.now(timezone.utc)}] ShipId: {ais_message['UserID']} Latitude: {ais_message['Latitude']} Latitude: {ais_message['Longitude']}")
                # print(takproto.functions.xml2proto(send_ship_data(ais_message=ais_message)))
                if ais_message["UserID"] in ship_static_data:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM) # UDP
                    sock.sendto(send_ship_data(ais_message=ais_message), ("192.168.2.44", 6868))
                    # sock.sendto(takproto.functions.xml2proto(send_ship_data(ais_message=ais_message)), ("192.168.2.44", 6970))

def send_ship_data(ais_message):
    root = ET.Element("event")
    root.set("version", "2.0")
    root.set("type", "a-n-S-X-M")
    root.set("uid", str(ais_message["UserID"]))
    root.set("how", "m-g")
    root.set("time", pytak.cot_time())
    root.set("start", pytak.cot_time())
    root.set("stale", pytak.cot_time(3600))
    location = ET.Element("point")
    location.set("lat", str(ais_message['Latitude']))
    location.set("lon", str(ais_message['Longitude']))
    location.set("hae", str(0))
    location.set("ce", str(999999))
    location.set("le", str(999999))
    root.append(location)
    if ais_message["UserID"] in ship_static_data:
        print("================HEYYYYY==================")
        detail = ET.Element("detail")
        contact = ET.Element("contact")
        contact.set("callsign", ship_static_data[ais_message['UserID']])
        detail.append(contact)
        track = ET.Element("track")
        track.set("speed", str(ais_message['Sog']))
        track.set("course", str(ais_message['Cog']))
        detail.append(track)
        #  track:{speed:27.266  course:138.793}
        root.append(detail)
    return ET.tostring(root)


if __name__ == "__main__":
    asyncio.run(asyncio.run(connect_ais_stream()))