import getpass
import requests
import pprint
import urllib.parse

BASE_URL = "http://localhost:8989"


def login(password: str):
    res = requests.post(f"{BASE_URL}/login", json={"password": password})
    res.raise_for_status()


def logout():
    res = requests.post(f"{BASE_URL}/logout")
    res.raise_for_status()


def keystore(mnemonic: str, password: str):
    res = requests.post(
        f"{BASE_URL}/keystore", json={"mnemonic": mnemonic, "password": password}
    )
    res.raise_for_status()


def get_wallet() -> dict:
    res = requests.get(f"{BASE_URL}/wallet")
    res.raise_for_status()
    return res.json()["data"]


def get_address(protocol: str, address_index: int) -> str:
    query = dict()
    if address_index:
        query["addressIndex"] = address_index
    res = requests.get(
        f"{BASE_URL}/wallet/address/{protocol}?{urllib.parse.urlencode(query)}"
    )
    res.raise_for_status()
    return res.json()["data"]


def get_balance(protocol: str, address_index: int, asset: str | None = None) -> str:
    query = dict()
    if address_index:
        query["addressIndex"] = address_index
    if asset:
        query["asset"] = asset
    res = requests.get(
        f"{BASE_URL}/wallet/balance/{protocol}?{urllib.parse.urlencode(query)}"
    )
    res.raise_for_status()
    return res.json()["data"]


def send(
    protocol: str,
    destination: str,
    amount: float,
    address_index: int,
    asset: str | None = None,
) -> dict:
    res = requests.post(
        f"{BASE_URL}/wallet/send",
        json={
            "protocol": protocol,
            "destination": destination,
            "amount": amount,
            "address_index": address_index,
            "asset": asset,
        },
    )
    res.raise_for_status()
    return res.json()["data"]


def protocol_and_address_index() -> tuple:
    # TODO: what protocols are available?
    protocol = input("Protocol? ")
    if not protocol:
        raise ValueError("Protocol is required.")
    try:
        address_index = int(input("Address index? (default 0) ") or 0)
        assert address_index >= 0
    except ValueError | AssertionError:
        raise ValueError("Address index must be a non-negative integer")
    return protocol, address_index


def input_loop():
    query = "Now what?\n\t1 Wallet\n\t2 Address\n\t3 Balance\n\t4 Send\n\t5 Keystore\n\t6 Exit\n> "
    match input(query).strip().lower():
        case "1" | "wallet":
            pprint.pprint(get_wallet())
        case "2" | "address":
            protocol, address_index = protocol_and_address_index()
            pprint.pprint(get_address(protocol, address_index))
        case "3" | "balance":
            protocol, address_index = protocol_and_address_index()
            asset = input("Asset? (default native token on chain) ") or None
            pprint.pprint(get_balance(protocol, address_index, asset))
        case "4" | "send":
            protocol, address_index = protocol_and_address_index()
            asset = input("Asset? (default native token on chain) ") or None
            address = get_address(protocol, address_index)
            balance = get_balance(protocol, address_index, asset)
            print(f"\nBalance: {balance} ({asset=}) - Address: {address}\n")
            try:
                amount = float(input("Enter amount: "))
            except ValueError:
                raise ValueError("Invalid amount")
            destination = input("Enter destination: ")
            pprint.pprint(send(protocol, destination, amount, address_index, asset))
        case "5" | "keystore":
            print("Really update your keystore?")
            print(
                "If you have a mnemonic saved, it will be ERASED - be sure you are not losing anything important!"
            )
            if input("Are you sure? [y/n] ").lower() == "y":
                mnemonic = getpass.getpass("Enter your mnemonic phrase: ")
                password = getpass.getpass("Enter your password: ")
                keystore(mnemonic, password)
        case "6" | "exit":
            return
        case unknown_command:
            print(f"Unknown command {unknown_command}.")
    input_loop()


def main():
    password = getpass.getpass("Please login. Enter password: ")
    login(password)
    print("Logged in.")
    input_loop()
    logout()
    print("Logged out.")


if __name__ == "__main__":
    main()
