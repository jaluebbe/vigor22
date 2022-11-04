FROM python:3.9-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN apt-get update && \
    apt-get install -y gdal-bin libgdal-dev g++ libgdal28 git && \
    pip install --upgrade pip && \
    pip install --no-cache-dir --upgrade -r /code/requirements.txt && \
    git clone https://github.com/klokantech/klokantech-gl-fonts \
    /code/fonts && \
    rm -fr /code/fonts/*CJK* && \
    apt-get -y remove g++ gdal-bin libgdal-dev git && \
    apt -y autoremove

COPY ./static /code/static
COPY ./mbtiles.py /code/
COPY ./*_style.json /code/
COPY ./backend_fastapi.py /code/

EXPOSE 80

CMD ["uvicorn", "backend_fastapi:app", "--host", "0.0.0.0", "--port", "80"]
