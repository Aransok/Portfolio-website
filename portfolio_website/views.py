from django.shortcuts import render,redirect
from django.core.mail import send_mail
import os
from dotenv import load_dotenv
from django.contrib import messages
from .models import Certificate


load_dotenv()

def home(request):
    return render(request, 'portfolio_website/home.html')  

def about(request):
    return render(request, 'portfolio_website/about.html')

def contact(request):
    if request.method == "POST":
        message_name = request.POST['message-name']
        message_email = request.POST['message-email']
        message = request.POST['message']
        recipient_email = os.getenv("EMAIL_HOST_USER")
        send_mail(
            f'From: {message_name}' + f' Email: {message_email}', 
            f'Message: {message}',
            message_email, 
            [recipient_email],
        )
        messages.success(request, '✅ Your message has been sent successfully!')

        return redirect('contact')

    
    else:
        return render(request, 'portfolio_website/contact.html', {})

def projects(request):
    return render(request, 'portfolio_website/projects.html')
from django.shortcuts import render, redirect
from .models import Certificate

def certificates(request, cert_id=None):
    certificates = Certificate.objects.all()

    # If cert_id is None or not in the certificates, select the first one
    if cert_id is None or cert_id not in [cert.id for cert in certificates]:
        cert_id = certificates.first().id if certificates.exists() else None

    current_certificate = next((cert for cert in certificates if cert.id == cert_id), None)

    # Get all the IDs to generate previous/next navigation
    cert_ids = [cert.id for cert in certificates]
    current_index = cert_ids.index(cert_id) if cert_id else 0
    prev_id = cert_ids[current_index - 1] if current_index > 0 else None
    next_id = cert_ids[current_index + 1] if current_index < len(cert_ids) - 1 else None

    context = {
        'certificates': certificates,
        'current_certificate': current_certificate,
        'prev_id': prev_id,
        'next_id': next_id,
    }

    return render(request, 'portfolio_website/certificates.html', context)

    

def demo_llm_summarizer(request):
    return render(request, 'portfolio_website/demo-llm-summarizer.html')

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
