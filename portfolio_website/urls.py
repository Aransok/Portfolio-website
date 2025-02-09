from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.home, name='home'),
    path('about', views.about, name='about'), 
    path('contact', views.contact, name='contact'), 
    path('projects', views.projects, name='projects'), 
    path('certificates', views.certificates, name='certificates'), 
    path('certificates/<str:category>/', views.certificates, name='certificates'),
    path('certificates/<str:category>/<int:cert_id>/', views.certificates, name='certificates'),

]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)