import os
import json
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

import chromadb
from chromadb.config import Settings
import logging

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

try:
    import cohere
except Exception:
    cohere = None

router = APIRouter()
from dotenv import load_dotenv

load_dotenv(dotenv_path="C:\\Users\\USER\\Documents\\Pronun-Analyzer-main\\backend\\.env")

# logger for this module
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def get_chroma_client():
        # Use persist directory if provided, otherwise default local folder
        persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
        try:
                client = chromadb.Client(Settings(chroma_db_impl=os.getenv("CHROMA_IMPL", "chromadb.db.DuckDB"), persist_directory=persist_dir))
        except Exception:
                # Fallback to default client settings
                client = chromadb.Client()
        return client


@router.post("/chatbot/query")
async def chatbot_query(payload: dict):
    """Query the ChromaDB index, rerank with Cohere and produce an answer using an LLM.

    Payload: {"query": "...", "max_results": 5}
    """
    query = payload.get("query")
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    max_results = int(payload.get("max_results", 5))

    # Initialize Chroma client and collection
    client = get_chroma_client()
    try:
        collection = client.get_collection(name="grammar_materials")
    except Exception:
        collection = client.create_collection(name="grammar_materials")

    # Query chroma
    try:
        results = collection.query(query_texts=[query], n_results=max_results, include=["documents", "metadatas", "distances"]) 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query ChromaDB: {e}")

    docs = []
    metas = []
    if results and isinstance(results, dict):
        docs = results.get('documents', [[]])[0]
        metas = results.get('metadatas', [[]])[0]

    # Cohere rerank
    reranked_docs: List[str] = docs
    try:
        cohere_key = os.getenv('COHERE_API_KEY')
        if cohere and cohere_key:
            co = cohere.Client(cohere_key)
            rr = co.rerank(model='rerank-english-v2', query=query, documents=docs)
            # Prefer rr.ranks if available (indices sorted by relevance)
            if hasattr(rr, 'ranks') and rr.ranks:
                ranked_indices = list(rr.ranks)
                reranked_docs = [docs[i] for i in ranked_indices if i < len(docs)]
            elif hasattr(rr, 'results') and isinstance(rr.results, list):
                # results may include 'index'
                ranked = []
                for r in rr.results:
                    idx = r.get('index') if isinstance(r, dict) else None
                    if idx is not None:
                        ranked.append(idx)
                if ranked:
                    reranked_docs = [docs[i] for i in ranked if i < len(docs)]
    except Exception:
        # If rerank fails, continue with original chroma order
        reranked_docs = docs

    # Build context for the LLM from top documents
    top_k = min(len(reranked_docs), max_results)
    context_snippets = []
    for i in range(top_k):
        text = reranked_docs[i] if i < len(reranked_docs) else ''
        meta = metas[i] if i < len(metas) else {}
        snippet = f"Source {i+1}: {text}"
        if meta:
            snippet += f"\nMetadata: {json.dumps(meta)}"
        context_snippets.append(snippet)

    system_prompt = (
        "You are a helpful, concise grammar tutor. Use the provided source snippets to answer the user's question. "
        "Give a clear explanation, and one short example sentence. Cite which source lines you used."
    )

    user_prompt = (
        f"User question: {query}\n\nProvided sources:\n" + "\n\n".join(context_snippets) + "\n\nAnswer:" 
    )

    # Wrap LLM call in try/except with JSON+CORS error handling
    try:
        # Use LangChain ChatGroq for faster, cheaper inference
        groq_api_key = os.getenv('GROQ_API_KEY')
        if not groq_api_key:
            logger.error('GROQ_API_KEY is not set on the server')
            return JSONResponse({"error": "GROQ_API_KEY is not set on the server"}, status_code=500, headers={"Access-Control-Allow-Origin": "*"})

        model_name = os.getenv('GROQ_MODEL', 'groq/compound')
        
        # Initialize LangChain ChatGroq
        try:
            llm = ChatGroq(
                api_key=groq_api_key,
                model=model_name,
                temperature=0.2,
                max_tokens=800
            )
        except Exception as e:
            logger.exception('Failed to init ChatGroq: %s', e)
            return JSONResponse({"error": "Failed to initialize LLM", "details": str(e)}, status_code=500, headers={"Access-Control-Allow-Origin": "*"})

        # Call LLM with system and user messages
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            response = llm.invoke(messages)
            answer = response.content if hasattr(response, 'content') else str(response).strip()
        except Exception as e:
            logger.exception('LangChain Groq call failed: %s', e)
            return JSONResponse({"error": "LLM request failed", "details": str(e)}, status_code=500, headers={"Access-Control-Allow-Origin": "*"})

        # Return answer and short list of sources
        return JSONResponse({
            "answer": answer,
            "sources": [s[:800] for s in reranked_docs[:top_k]]
        }, headers={"Access-Control-Allow-Origin": "*"})

    except HTTPException:
        # Re-raise HTTPExceptions so FastAPI handles them normally
        raise
    except Exception as e:
        logger.exception('Unhandled exception in chatbot_query: %s', e)
        return JSONResponse({"error": "Internal server error", "details": str(e)}, status_code=500, headers={"Access-Control-Allow-Origin": "*"})

