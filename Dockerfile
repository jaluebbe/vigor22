FROM python:3.9-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN apt-get update && \
    apt-get install -y gdal-bin libgdal-dev g++ libgdal28 && \
    pip install --upgrade pip && \
    pip install --no-cache-dir --upgrade -r /code/requirements.txt && \
    apt-get -y remove g++ gdal-bin libgdal-dev && \
    apt -y autoremove

COPY ./static /code/static
COPY ./backend_fastapi.py /code/

CMD ["uvicorn", "backend_fastapi:app", "--host", "0.0.0.0", "--port", "80"]
