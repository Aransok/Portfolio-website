from django.shortcuts import render

def home(request):
    return render(request, 'portfolio_website/home.html')  

def about(request):
    return render(request, 'portfolio_website/about.html')

def contact(request):
    return render(request, 'portfolio_website/contact.html')

def projects(request):
    return render(request, 'portfolio_website/projects.html')

def certificates(request):
    return render(request, 'portfolio_website/certificates.html')
