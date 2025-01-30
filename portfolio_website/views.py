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

def certificates(request, cert_id=None):
    certificates = [
        {
            'id': 1,
            'name': 'Python Basics Certification',
            'image': '/static/media/Programming Basics - January 2022 - Certificate.jpeg',
            'description': 'Python Basics Certifications by SoftUni course. Course key points: Structures, If statements, For and While loops.',
            'url':'https://softuni.bg/certificates/details/127200/734df61c'
        },
        {
            'id': 2,
            'name': 'Python Fundamentals Certification',
            'image': '/static/media/Programming Fundamentals with Python - September 2022 - Certificate.jpeg',
            'description': 'Python Fundamentals Certifications by SoftUni course. Course key points: Functions, Lists, Dictionaries, Tuples, Sets, Files.',
            'url':'https://softuni.bg/certificates/details/151544/559cb886'
        },
       
    ]
    
    if cert_id is None:
        cert_id = 1
    else:
        cert_id = int(cert_id)
    
    current_certificate = next((cert for cert in certificates if cert['id'] == cert_id), certificates[0])
    
    cert_ids = [cert['id'] for cert in certificates]
    current_index = cert_ids.index(cert_id)
    prev_id = cert_ids[current_index - 1] if current_index > 0 else None
    next_id = cert_ids[current_index + 1] if current_index < len(cert_ids) - 1 else None
    
    context = {
        'certificates': certificates,
        'current_certificate': current_certificate,
        'prev_id': prev_id,
        'next_id': next_id,
    }
    
    return render(request, 'portfolio_website/certificates.html', context)