Create and actiate the local environment using conda/miniforge:

conda env create -f environment.yml

conda activate vigor22

To run the API as a single process:

uvicorn backend_fastapi:app --host 0.0.0.0 --port 80

or to run four processes of the API:

gunicorn -w4 -b 0.0.0.0:8000 backend_fastapi:app -k uvicorn.workers.UvicornWorker
