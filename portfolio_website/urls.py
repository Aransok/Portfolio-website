from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('about', views.about, name='about'), 
    path('contact', views.contact, name='contact'), 
    path('projects', views.projects, name='projects'), 
    path('certificates', views.certificates, name='certificates'), 
    path('certificates/<int:cert_id>/', views.certificates, name='certificates'),
    path('demo-llm-summarizer' , views.demo_llm_summarizer, name='demo_llm_summarizer'),

]
