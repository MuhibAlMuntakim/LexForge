import os
from typing import Union
import docx
from pypdf import PdfReader

class ContractLoader:
    """Utility to load contract text from various file formats."""
    
    @staticmethod
    def load(file_path: str) -> str:
        """
        Loads the content of a file and returns it as a string.
        Supports PDF, DOCX, and TXT.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == ".pdf":
            return ContractLoader._load_pdf(file_path)
        elif ext == ".docx":
            return ContractLoader._load_docx(file_path)
        elif ext == ".txt":
            return ContractLoader._load_txt(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")

    @staticmethod
    def _load_pdf(file_path: str) -> str:
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        except Exception as e:
            text = f"Error reading PDF: {str(e)}"
        return text.strip()

    @staticmethod
    def _load_docx(file_path: str) -> str:
        try:
            doc = docx.Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs]).strip()
        except Exception as e:
            return f"Error reading DOCX: {str(e)}"

    @staticmethod
    def _load_txt(file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read().strip()
        except Exception as e:
            return f"Error reading TXT: {str(e)}"

if __name__ == "__main__":
    # Quick test
    loader = ContractLoader()
    print("Contract Loader initialized.")
