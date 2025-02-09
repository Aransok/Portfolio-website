import requests
from bs4 import BeautifulSoup
import torch
from langchain_huggingface import HuggingFacePipeline
from langchain.prompts.chat import ChatPromptTemplate
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from huggingface_hub import login
from googletrans import Translator 
import os

class ArticleSummarizer:
    def __init__(self, model_id, hf_token):
        login(hf_token)  
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(model_id)
        self.hf_pipeline = pipeline(
            "text-generation", 
            model=model, 
            tokenizer=self.tokenizer, 
            return_full_text=False,
            pad_token_id=self.tokenizer.eos_token_id, 
            temperature=0.1, 
            torch_dtype=torch.bfloat16, 
            max_new_tokens=200
        )
        self.hf_llm = HuggingFacePipeline(pipeline=self.hf_pipeline)
        self.max_tokens = 128000  

    def fetch_article(self, url):
        response = requests.get(url).text
        html = BeautifulSoup(response, 'html.parser')
        main_content = self.tag_selector(html)
        paragraphs = main_content.find_all("p")
        article = "\n".join(p.get_text().strip() for p in paragraphs if p.get_text().strip())
        return article.strip()

    def tag_selector(self, html):
        tags = ["article", "main", "main-content"]
        for tag in tags:
            found = html.find(tag)
            if found:
                return found  

        article_classes = html.find_all(class_=lambda value: value and 'article' in value)
        if article_classes:
            return article_classes
        
        content_classes = html.find_all(class_=lambda value: value and 'content' in value)
        if content_classes:
            return content_classes

        return None

    def summarize_article(self, article):
        tokens_count = self.tokenizer(article, return_tensors='pt')['input_ids'].shape[1]
        if tokens_count > self.max_tokens:
            raise ValueError(f"Article exceeds the maximum token limit of {self.max_tokens}.")
        
        prompt = f"""
        You are a professional article summarizer. Your task is to generate a concise summary (less than 4 sentences) of the article. 
        You must follow the exact format below:
        
        Summary: "<generated summary>"
        
        Here is the article:
        {article}
        """
        
        chat_prompt = ChatPromptTemplate.from_messages([("system", prompt)])
        chain = chat_prompt | self.hf_llm
        result = chain.invoke({"article": article}).strip()
        
        return result

    def generate_title(self, summary):
        prompt = f"""
        You are a professional article summarizer. Your task is to generate a **short** title based on the summary of the article that i will give. 
        The title must be **less than 10 words** and follow the exact format below dont include anything else besides the title:

        Title: "<generated title>"
        
        Here is the summary of the article:
        {summary}
        """
        
        chat_prompt = ChatPromptTemplate.from_messages([("system", prompt)])
        chain = chat_prompt | self.hf_llm
        result = chain.invoke({"summary": summary}).strip()
        
        return result
    def translate_text(self, text, target_language):
        translator = Translator()
        translated = translator.translate(text, dest=target_language)
        return translated.text

    def process_article(self, url, translate, language=None):
        article = self.fetch_article(url)
        summary = self.summarize_article(article) 
        title = self.generate_title(summary)  
        
        if translate:
            translated_title = self.translate_text(title, language)
            translated_summary = self.translate_text(summary, language)
            return translated_title, translated_summary
        else:
            return title, summary
if __name__ == "__main__":
    hf_token = os.getenv("HUGGINGFACE_API_KEY")  
    if not hf_token:
        raise ValueError("Hugging Face API key not found. Set 'HUGGINGFACE_API_KEY' in .env file.")
    model_id = "meta-llama/Llama-2-7b"

    summarizer = ArticleSummarizer(model_id=model_id, hf_token=hf_token)

    url = input("Enter the article URL: ").strip()
    translate_choice = input("Do you want to translate the title and summary? (yes/no): ").strip().lower()

    if translate_choice == "yes":
        target_language = input("Enter the language for translation (e.g., 'fr' for French, 'de' for German): ").strip()
        translate = True
    else:
        translate = False
        target_language = None

    try:
        title, summary = summarizer.process_article(url, translate, target_language)
        print(f"{title}\n\n{summary}")
    except ValueError as e:
        print(e)
"""
This summarizer can translate i tried to add a fun mode too but the llm was just ignoring the prompt so its just version with translation
Problems
- it doesen't provide the output as it is in the prompt 
"""