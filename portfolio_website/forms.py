from django import forms

LANGUAGE_CHOICES = [
    ("en", "English"),
    ("fr", "French"),
    ("de", "German"),
    ("es", "Spanish"),
    ("it", "Italian"),
    ("zh-cn", "Chinese"),
    ("ja", "Japanese"),
    ("ru", "Russian"),
    ("ar", "Arabic"),
    ("hi", "Hindi"),
    ("pt", "Portuguese"),
    ("ko", "Korean"),
    ("tr", "Turkish"),
    ("nl", "Dutch"),
    ("sv", "Swedish"),
    ("pl", "Polish"),
    ("fi", "Finnish"),
    ("cs", "Czech"),
    ("el", "Greek"),
    ("he", "Hebrew"),
    ("th", "Thai"),
    ("vi", "Vietnamese"),
    ("id", "Indonesian"),
    ("uk", "Ukrainian"),
    ("hu", "Hungarian"),
    ("ro", "Romanian"),
    ("bg", "Bulgarian"),
    ("da", "Danish"),
]

class SummarizerForm(forms.Form):
    url = forms.URLField(
        label="Article URL",
        widget=forms.URLInput(attrs={"class": "form-control"}),
    )
    translate = forms.BooleanField(
        required=False,
        label="Translate?",
        widget=forms.CheckboxInput(attrs={"class": "form-check-input"}),
    )
    language = forms.ChoiceField(
        choices=LANGUAGE_CHOICES,
        required=False,
        label="Select Language",
        widget=forms.Select(attrs={"class": "form-control"}),
        initial="en",  
    )
