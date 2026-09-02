FROM python:3.12-slim-bookworm

ARG OPENMONTAGE_REF=cd9f3c1f03368be87b140af494914b8ee4e3c7a4

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OPENMONTAGE_ROOT=/opt/OpenMontage \
    OPENMONTAGE_DATA_DIR=/data/openmontage \
    PORT=8080

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ffmpeg ca-certificates curl unzip \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --requirement requirements.txt

RUN git clone https://github.com/calesthio/OpenMontage.git /opt/OpenMontage \
    && cd /opt/OpenMontage \
    && git checkout "${OPENMONTAGE_REF}" \
    && pip install --requirement requirements.txt

COPY app.py ./app.py
RUN mkdir -p /data/openmontage

VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3).read()"

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --proxy-headers"]
