import resend
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.cache import cache_control
from django.conf import settings
from django.utils.translation import gettext as _
from django.contrib import messages
from django.template.loader import render_to_string
from .models import Certificate, Diploma, AI_LLM
from . import github_activity


def home(request):
    return render(request, 'portfolio_website/home.html')

@cache_control(public=True, max_age=1800)
def activity(request):
    """Contribution calendar as JSON, loaded by the home page after render."""
    if settings.ACTIVITY_SAMPLE:
        days = github_activity.sample_days()
        data = {"days": days, "summary": github_activity.summarize(days), "sample": True}
    else:
        data = github_activity.get_activity(settings.GITHUB_USERNAME)
    if not data:
        return JsonResponse({"ok": False}, status=503)
    return JsonResponse({"ok": True, "username": settings.GITHUB_USERNAME, **data})

def about(request):
    return render(request, 'portfolio_website/about.html')

def contact(request):
    if request.method == "POST":
        # the form's own JS posts with fetch and wants JSON back, plain posts get a redirect
        wants_json = request.headers.get('X-Requested-With') == 'fetch'
        message_name = request.POST.get('message-name', '').strip()
        message_email = request.POST.get('message-email', '').strip()
        message = request.POST.get('message', '').strip()

        if not (message_name and message and '@' in message_email):
            text = _('Please fill in your name, a valid email and a message.')
            if wants_json:
                return JsonResponse({"ok": False, "message": text}, status=400)
            messages.error(request, text)
            return redirect('contact')

        sent = True
        if not settings.RESEND_API_KEY and settings.DEBUG:
            # local runs have no Resend key: show the email in the server log instead
            print(f'[contact, dev, not emailed] {message_name} <{message_email}>: {message}')
        else:
            try:
                html_body = render_to_string('portfolio_website/emails/contact_notification.html', {
                    'sender_name': message_name,
                    'sender_email': message_email,
                    'message_body': message,
                })
                resend.api_key = settings.RESEND_API_KEY
                resend.Emails.send({
                    # Resend's shared onboarding domain can only send to the
                    # account's own verified address, which is exactly this form's
                    # recipient - no custom domain verification needed.
                    "from": "Portfolio Contact Form <onboarding@resend.dev>",
                    "to": [settings.CONTACT_RECIPIENT_EMAIL],
                    "reply_to": message_email,
                    "subject": f'Portfolio contact from {message_name}',
                    "html": html_body,
                    "text": f'From: {message_name} <{message_email}>\n\nMessage:\n{message}',
                })
            except Exception:
                sent = False

        text = (_('Your message has been sent successfully!') if sent
                else _('Sorry, your message could not be sent right now. Please try again later.'))
        if wants_json:
            return JsonResponse({"ok": sent, "message": text}, status=200 if sent else 502)
        (messages.success if sent else messages.error)(request, text)
        return redirect('contact')

    else:
        return render(request, 'portfolio_website/contact.html', {})

def projects(request):
    return render(request, 'portfolio_website/projects.html')


def certificates(request, category="certificates", cert_id=None):
    categories = {
        "certificates": Certificate.objects.all(),
        "diplomas": Diploma.objects.all(),
        "ai_llms": AI_LLM.objects.all(),
    }

    items = categories.get(category, Certificate.objects.all())  
    selected_item = next((item for item in items if item.id == cert_id), None)

    if selected_item is None and items.exists():
        selected_item = items.first()
        cert_id = selected_item.id

    item_ids = [item.id for item in items]
    current_index = item_ids.index(cert_id) if cert_id in item_ids else 0
    prev_id = item_ids[current_index - 1] if current_index > 0 else None
    next_id = item_ids[current_index + 1] if current_index < len(item_ids) - 1 else None

    context = {
        "categories": categories.keys(), 
        "current_category": category,
        "items": items,
        "current_certificate": selected_item,
        "prev_id": prev_id,
        "next_id": next_id,
    }

    return render(request, 'portfolio_website/certificates.html', context)
def custom_400(request, exception):
    response = render(request, "portfolio_website/400.html")
    response.status_code = 400
    return response

def custom_404(request, exception):
    response = render(request, "portfolio_website/404.html")
    response.status_code = 404
    return response

def custom_500(request):
    response = render(request, "portfolio_website/500.html")
    response.status_code = 500
    return response
