import base64
import json
from types import SimpleNamespace

import boto3

from config import Config

_cognito = None


def _client():
    global _cognito
    if _cognito is None:
        _cognito = boto3.client("cognito-idp", region_name=Config.AWS_REGION)
    return _cognito


def _claims(id_token: str) -> dict:
    # Token comes straight from Cognito over TLS in this same call, so signature check is not needed here.
    payload = id_token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))


def _response(tokens: dict):
    claims = _claims(tokens["IdToken"])
    user = SimpleNamespace(
        id=claims.get("sub"),
        email=claims.get("email", ""),
        user_metadata={"full_name": claims.get("name", "")},
    )
    session = SimpleNamespace(
        access_token=tokens["AccessToken"],
        refresh_token=tokens.get("RefreshToken", ""),
    )
    return SimpleNamespace(user=user, session=session)


def sign_up_user(email: str, password: str, full_name: str = ""):
    attrs = [{"Name": "email", "Value": email}]
    if full_name:
        attrs.append({"Name": "name", "Value": full_name})
    result = _client().sign_up(
        ClientId=Config.COGNITO_CLIENT_ID,
        Username=email,
        Password=password,
        UserAttributes=attrs,
    )
    if result.get("UserConfirmed"):
        return sign_in_user(email, password)
    return SimpleNamespace(user=SimpleNamespace(id=result["UserSub"], email=email), session=None)


def sign_in_user(email: str, password: str):
    result = _client().initiate_auth(
        ClientId=Config.COGNITO_CLIENT_ID,
        AuthFlow="USER_PASSWORD_AUTH",
        AuthParameters={"USERNAME": email, "PASSWORD": password},
    )
    if "AuthenticationResult" not in result:
        raise ValueError(f"Additional challenge required: {result.get('ChallengeName')}")
    return _response(result["AuthenticationResult"])


def sign_out_user(access_token: str = ""):
    if access_token:
        _client().global_sign_out(AccessToken=access_token)


def confirm_user(email: str, code: str):
    _client().confirm_sign_up(
        ClientId=Config.COGNITO_CLIENT_ID,
        Username=email,
        ConfirmationCode=code,
    )
