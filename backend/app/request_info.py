# Who is calling: the client's IP address and browser, taken from the request headers.
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request


@dataclass(frozen=True)
class ClientInfo:
    ip_address: str | None
    user_agent: str | None


# Behind Vercel the first x-forwarded-for value is the real client; locally the socket address is used.
def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45] or None
    return request.client.host[:45] if request.client else None


def get_client_info(request: Request) -> ClientInfo:
    return ClientInfo(client_ip(request), (request.headers.get("user-agent") or "")[:200] or None)


ClientDep = Annotated[ClientInfo, Depends(get_client_info)]
