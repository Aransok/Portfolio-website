"""
URL configuration for portfoliowebsite project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.i18n import i18n_patterns
from django.views.static import serve
from portfolio_website import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('i18n/', include('django.conf.urls.i18n')),
    path('activity.json', views.activity, name='activity'),
    # Served unconditionally (not gated by DEBUG): no cloud storage is configured, so
    # uploaded media is committed to the repo and must be served by Django in production too.
    # django.conf.urls.static.static() no-ops when DEBUG=False, so serve is wired directly.
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

urlpatterns += i18n_patterns(
    path('', include('portfolio_website.urls')),
    prefix_default_language=False,
)
handler400 = 'portfolio_website.views.custom_400'
handler404 = 'portfolio_website.views.custom_404'
handler500 = 'portfolio_website.views.custom_500'