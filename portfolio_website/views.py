from django.shortcuts import render,redirect
from django.core.mail import send_mail
import os
from dotenv import load_dotenv
from django.contrib import messages


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
        messages.success(request, '✅ Your message has been sent successfully!')

        # Redirect to the same page (GET request)
        return redirect('contact')

    
    else:
        return render(request, 'portfolio_website/contact.html', {})

def projects(request):
    return render(request, 'portfolio_website/projects.html')

def certificates(request):
    return render(request, 'portfolio_website/certificates.html')
