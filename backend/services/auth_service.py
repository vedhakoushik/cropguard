from services.supabase_client import get_supabase


def sign_up_user(email: str, password: str, full_name: str = ""):
    sb = get_supabase()
    payload = {
        "email": email,
        "password": password,
    }
    if full_name:
        payload["options"] = {"data": {"full_name": full_name}}
    return sb.auth.sign_up(payload)


def sign_in_user(email: str, password: str):
    sb = get_supabase()
    return sb.auth.sign_in_with_password({
        "email": email,
        "password": password,
    })


def sign_out_user():
    sb = get_supabase()
    return sb.auth.sign_out()
