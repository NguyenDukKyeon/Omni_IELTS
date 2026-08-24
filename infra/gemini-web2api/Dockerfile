FROM alpine/git:2.49.1 AS source

ARG GEMINI_WEBAPI_COMMIT
RUN test -n "$GEMINI_WEBAPI_COMMIT" \
    && git clone --filter=blob:none https://github.com/HanaokaYuzu/Gemini-API.git /source \
    && git -C /source checkout --detach "$GEMINI_WEBAPI_COMMIT"

FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir \
    curl-cffi==0.16.0 \
    loguru==0.7.3 \
    orjson==3.11.9 \
    pydantic==2.12.5 \
    fastapi==0.116.1 \
    uvicorn==0.35.0
COPY --from=source /source/src /opt/gemini-api/src
COPY --from=source /source/LICENSE /licenses/HanaokaYuzu-Gemini-API-AGPL-3.0.txt
COPY infra/gemini-web2api/entrypoint.py /usr/local/bin/omni-gemini-web2api
ENV PYTHONPATH=/opt/gemini-api/src

EXPOSE 8081
ENTRYPOINT ["python", "/usr/local/bin/omni-gemini-web2api"]
