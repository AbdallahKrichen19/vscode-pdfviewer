from fastapi import FastAPI, UploadFile, Form
import pdfplumber
from transformers import pipeline
from sentence_transformers import SentenceTransformer
from chromadb import Client

app = FastAPI()

# Load Sentence Embeddings model
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Load GPT-Neo or any other open-source model for question answering
qa_model = pipeline("text-generation", model="meta-llama/Llama-3.1-8B")

# Initialize vector store
client = Client()
collection = client.create_collection('pdf-embeddings')

# Extract text from PDF
def extract_text_from_pdf(pdf_file):
    with pdfplumber.open(pdf_file) as pdf:
        text = ''
        for page in pdf.pages:
            text += page.extract_text()
        return text

@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile):
    # Extract text from the PDF
    pdf_text = extract_text_from_pdf(file.file)
    
    # Generate embeddings
    embeddings = embedding_model.encode(pdf_text)
    
    # Store embeddings in vector database
    collection.add(
        ids=[file.filename],
        embeddings=[embeddings],
        metadatas=[{'text': pdf_text}]
    )
    
    return {"message": "PDF uploaded and processed successfully."}

@app.post("/ask_question/")
async def ask_question(question: str = Form(...)):
    # Generate embedding for the query
    query_embedding = embedding_model.encode(question)
    
    # Find relevant text sections from the vector store
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5
    )
    
    # Combine relevant sections to form context
    context = " ".join([res['text'] for res in results['documents']])
    
    # Generate answer using GPT-Neo
    prompt = f"The document says: {context}\n\nQuestion: {question}\nAnswer:"
    response = qa_model(prompt)
    
    # Extract answer from response
    answer = response[0]['generated_text'].split("Answer: ")[1].strip()
    
    return {"answer": answer}
