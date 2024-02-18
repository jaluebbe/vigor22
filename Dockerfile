FROM python:3.11-slim

WORKDIR /code

COPY ./requirements_cloud.txt /code/requirements.txt
RUN apt-get update && \
    apt-get install -y gdal-bin libgdal-dev g++ libgdal32 git && \
    pip install --upgrade pip && \
    pip install --no-cache-dir --upgrade -r /code/requirements.txt && \
    git clone https://github.com/klokantech/klokantech-gl-fonts \
    /code/fonts && \
    rm -fr /code/fonts/*CJK* && \
    apt-get -y remove g++ gdal-bin libgdal-dev git && \
    apt -y autoremove

COPY ./static /code/static
COPY ./*_style.json /code/
COPY ./backend_cloud.py /code/
COPY ./routers /code/routers

EXPOSE 80

CMD ["uvicorn", "backend_cloud:app", "--host", "0.0.0.0", "--port", "80"]
