from django.shortcuts import render,redirect
from django.core.mail import send_mail
import os
from dotenv import load_dotenv
from django.contrib import messages
from .models import Certificate, Diploma, AI_LLM
from django.http import JsonResponse
from .forms import SummarizerForm
from django.views.decorators.csrf import csrf_protect
from portfolio_website.utils.LLM_Article_Summarizer import ArticleSummarizer
from huggingface_hub import login
from django.shortcuts import render, redirect
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
@csrf_protect  
def demo_llm_summarizer(request):
    summary = None
    title = None
    error = None
    language = "en" 

    if request.method == "POST":
        form = SummarizerForm(request.POST)
        if form.is_valid():
            url = form.cleaned_data["url"]
            translate = form.cleaned_data["translate"]
            language = form.cleaned_data["language"] if translate else "en"  

            try:
                model_id = "meta-llama/Llama-3.2-1B-Instruct"
                hf_token = os.getenv("HUGGINGFACE_API_KEY")

                summarizer = ArticleSummarizer(model_id=model_id, hf_token=hf_token)
                title, summary = summarizer.process_article(url, translate, language)
                
                return JsonResponse({"title": title, "summary": summary})
            except Exception as e:
                error = str(e)
                return JsonResponse({"error": error}, status=400)

        else:
            error = "Form is invalid."
            return JsonResponse({"error": error}, status=400)

    else:
        form = SummarizerForm(initial={"language": "en"})

    return render(request, "portfolio_website/demo-llm-summarizer.html", {"form": form, "title": title, "summary": summary, "error": error})
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
