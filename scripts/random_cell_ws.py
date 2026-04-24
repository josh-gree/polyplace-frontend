import argparse
import asyncio
import json
import random
import struct
import time

from aiohttp import web, WSMsgType


GRID_SIZE = 1000
PALETTE = [
    (233, 79, 55),
    (33, 166, 122),
    (41, 121, 199),
    (242, 200, 75),
    (21, 21, 21),
    (196, 69, 105),
    (0, 166, 166),
    (255, 255, 255),
]
RENTERS = [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444",
]
_MAGIC = b"PLG\x01"


def empty_snapshot() -> bytes:
    # PLG format: magic + <HHIII(width, height, n_renters, n_rented, meta_offset)>
    # + address_table + bitmap + packed_colors + rental_records
    width = height = GRID_SIZE
    bitmap_size = (width * height + 7) // 8
    meta_offset = 20 + bitmap_size  # header + empty addr table + bitmap + empty colors
    header = _MAGIC + struct.pack("<HHIII", width, height, 0, 0, meta_offset)
    return header + bytes(bitmap_size)


def make_cell(rng: random.Random) -> str:
    x = rng.randrange(GRID_SIZE)
    y = rng.randrange(GRID_SIZE)
    r, g, b = rng.choice(PALETTE)
    # Every update simulates a fresh rental that will fully fade over the next
    # 60 seconds — matching the frontend FADE_WINDOW so cells start fully
    # saturated at paint time and reach greyscale at expiry.
    return json.dumps(
        {
            "i": y * GRID_SIZE + x,
            "r": r,
            "g": g,
            "b": b,
            "renter": rng.choice(RENTERS),
            "expires_at": int(time.time()) + 60,
        },
        separators=(",", ":"),
    )


async def grid_handler(request: web.Request) -> web.Response:
    return web.Response(
        body=empty_snapshot(),
        content_type="application/octet-stream",
        headers={"Access-Control-Allow-Origin": "*"},
    )


async def ws_handler(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    rng = random.Random(request.app["seed"])
    delay = 1 / request.app["rate"]

    try:
        while not ws.closed:
            await ws.send_str(make_cell(rng))
            await asyncio.sleep(delay)
    except (ConnectionResetError, asyncio.CancelledError):
        pass
    return ws


def main() -> None:
    parser = argparse.ArgumentParser(description="Fake Polyplace backend: serves /grid snapshot + /ws live updates.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--rate", type=int, default=1000, help="cells per second")
    parser.add_argument("--seed", type=int, default=20260416)
    args = parser.parse_args()

    app = web.Application()
    app["rate"] = args.rate
    app["seed"] = args.seed
    app.router.add_get("/grid", grid_handler)
    app.router.add_get("/ws", ws_handler)

    print(f"Fake backend listening on http://{args.host}:{args.port} (rate={args.rate}/s)", flush=True)
    web.run_app(app, host=args.host, port=args.port, print=None)


if __name__ == "__main__":
    main()
