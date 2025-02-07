from django.shortcuts import render,redirect
from django.core.mail import send_mail
import os
from dotenv import load_dotenv
from django.contrib import messages
from .models import Certificate, Diploma, AI_LLM


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

def certificates(request, category="certificates", cert_id=None):
    # Define the available categories
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
        "categories": categories.keys(),  # List of category names
        "current_category": category,
        "items": items,
        "current_certificate": selected_item,
        "prev_id": prev_id,
        "next_id": next_id,
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
