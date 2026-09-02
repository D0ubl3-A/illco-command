FROM python:3.12-slim-bookworm

ARG OPENMONTAGE_REF=cd9f3c1f03368be87b140af494914b8ee4e3c7a4

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    AUTOTUBE_DATA_DIR=/data \
    OPENMONTAGE_ROOT=/opt/OpenMontage \
    OPENMONTAGE_DATA_DIR=/data/openmontage \
    PORT=8080 \
    DENO_INSTALL=/usr/local

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates git curl unzip \
    && curl -fsSL https://deno.land/install.sh | sh \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 autotube \
    && useradd --uid 10001 --gid autotube --create-home --shell /usr/sbin/nologin autotube \
    && mkdir -p /app /data /data/openmontage

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --requirement requirements.txt

RUN git clone https://github.com/calesthio/OpenMontage.git /opt/OpenMontage \
    && cd /opt/OpenMontage \
    && git checkout "${OPENMONTAGE_REF}"

COPY app.py ./app.py
COPY app_v4.py ./app_v4.py
COPY app_v4_runtime.py ./app_v4_runtime.py
COPY openmontage_routes.py ./openmontage_routes.py
COPY playability.py ./playability.py

RUN chown -R autotube:autotube /app /data /opt/OpenMontage

USER autotube
VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3).read()"

CMD ["sh", "-c", "uvicorn app_v4_runtime:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --proxy-headers"]
