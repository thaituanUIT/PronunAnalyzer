"""Index documents into ChromaDB using LangChain loaders and chunking.

Usage:
  python load_chroma.py --source_dir ./learning_materials --persist_dir ./chroma_db --collection grammar_materials

The script will discover PDFs, TXT and MD files under `source_dir`, split into chunks with
`RecursiveCharacterTextSplitter`, compute embeddings with OpenAI (requires OPENAI_API_KEY), and
persist them into a Chroma collection (using LangChain's Chroma wrapper).
"""
import os
import argparse
import glob
import logging

from typing import List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def find_files(source_dir: str, patterns: List[str] = None) -> List[str]:
    if patterns is None:
        patterns = ["**/*.pdf", "**/*.md", "**/*.txt"]
    matches = []
    for p in patterns:
        matches.extend(glob.glob(os.path.join(source_dir, p), recursive=True))
    # Deduplicate and sort
    return sorted(list(dict.fromkeys(matches)))


def load_documents(paths: List[str]):
    """Load documents using LangChain loaders with fallback options."""
    docs = []
    try:
        # Import locally to avoid requiring langchain at module import time
        from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredFileLoader
    except Exception as e:
        raise RuntimeError("Please install langchain and necessary loaders (pip install langchain pypdf unstructured)") from e

    for path in paths:
        ext = os.path.splitext(path)[1].lower()
        try:
            if ext == '.pdf':
                loader = PyPDFLoader(path)
                pages = loader.load_and_split()
                # attach metadata for each page
                for i, p in enumerate(pages):
                    if not p.page_content.strip():
                        continue
                    p.metadata = p.metadata or {}
                    p.metadata.update({"source": path, "page": i + 1})
                docs.extend(pages)
            elif ext in ('.md', '.txt'):
                loader = TextLoader(path, encoding='utf-8')
                d = loader.load()
                for dd in d:
                    dd.metadata = dd.metadata or {}
                    dd.metadata.update({"source": path})
                docs.extend(d)
            else:
                # fallback to UnstructuredFileLoader for other formats
                loader = UnstructuredFileLoader(path)
                d = loader.load()
                for dd in d:
                    dd.metadata = dd.metadata or {}
                    dd.metadata.update({"source": path})
                docs.extend(d)
            logger.info(f"Loaded {path}")
        except Exception as e:
            logger.warning(f"Failed to load {path}: {e}")

    return docs


def chunk_and_persist(docs, persist_directory: str, collection_name: str, chunk_size: int = 1000, chunk_overlap: int = 200, embeddings_model: str = 'sentence-transformers/all-MiniLM-L6-v2'):
    """Split documents into chunks and persist to Chroma via LangChain's Chroma wrapper."""
    try:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_chroma import Chroma
        from langchain_huggingface import HuggingFaceEmbeddings
    except Exception as e:
        raise RuntimeError("Please install langchain and huggingface embeddings provider (pip install langchain sentence-transformers transformers)") from e

    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    logger.info(f"Splitting {len(docs)} documents into chunks (chunk_size={chunk_size}, overlap={chunk_overlap})")
    split_docs = splitter.split_documents(docs)
    logger.info(f"Created {len(split_docs)} chunks")

    # Use HuggingFaceEmbeddings
    # You can specify a model name, e.g., 'sentence-transformers/all-MiniLM-L6-v2' or another supported model
    model_name = embeddings_model or 'sentence-transformers/all-MiniLM-L6-v2'
    embeddings = HuggingFaceEmbeddings(model_name=model_name)

    persist_directory = os.path.abspath(persist_directory)
    os.makedirs(persist_directory, exist_ok=True)

    logger.info(f"Persisting to Chroma directory: {persist_directory}, collection: {collection_name}")
    chroma = Chroma.from_documents(split_docs, embedding=embeddings, persist_directory=persist_directory, collection_name=collection_name)
    logger.info("Persistence complete")


def main():
    parser = argparse.ArgumentParser(description='Index documents into ChromaDB')
    parser.add_argument('--source_dir', type=str, required=True, help='Directory containing documents to index')
    parser.add_argument('--persist_dir', type=str, default='./chroma_db', help='ChromaDB persist directory')
    parser.add_argument('--collection', type=str, default='grammar_materials', help='Chroma collection name')
    parser.add_argument('--chunk_size', type=int, default=1000, help='Chunk size for splitting')
    parser.add_argument('--chunk_overlap', type=int, default=200, help='Chunk overlap')
    parser.add_argument('--embeddings_model', type=str, default='sentence-transformers/all-MiniLM-L6-v2', help='Embeddings model name')

    args = parser.parse_args()

    files = find_files(args.source_dir)
    if not files:
        logger.error(f"No documents found in {args.source_dir}")
        return

    logger.info(f"Found {len(files)} files to index")
    docs = load_documents(files)
    if not docs:
        logger.error("No document content loaded; aborting")
        return

    chunk_and_persist(docs, args.persist_dir, args.collection, args.chunk_size, args.chunk_overlap, args.embeddings_model)


if __name__ == '__main__':
    main()
