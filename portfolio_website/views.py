from django.shortcuts import render
from django.core.mail import send_mail
import os
from dotenv import load_dotenv

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
        # Send an email
        send_mail(
            f'From: {message_name}' + f' Email: {message_email}', 
            f'Message: {message}',
            message_email, 
            [recipient_email],
        )
        return render(request, 'portfolio_website/contact.html', {'success': True, 'message_name': message_name, 'message_email': message_email, 'message': message})

    
    else:
        return render(request, 'portfolio_website/contact.html', {})

def projects(request):
    return render(request, 'portfolio_website/projects.html')

def certificates(request):
    return render(request, 'portfolio_website/certificates.html')
