conda env create -f environment.yml
conda activate vigor22
gunicorn -w4 -b 0.0.0.0:8000 backend_fastapi:app -k uvicorn.workers.UvicornWorker
