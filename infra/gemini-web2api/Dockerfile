FROM alpine/git:2.49.1 AS source

ARG GEMINI_WEB2API_COMMIT
RUN test -n "$GEMINI_WEB2API_COMMIT" \
    && git clone --filter=blob:none https://github.com/Sophomoresty/gemini-web2api.git /source \
    && git -C /source checkout --detach "$GEMINI_WEB2API_COMMIT"

FROM python:3.12-slim

WORKDIR /app
COPY --from=source /source/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=source /source/gemini_web2api ./gemini_web2api
COPY infra/gemini-web2api/entrypoint.py /usr/local/bin/omni-gemini-web2api

EXPOSE 8081
ENTRYPOINT ["python", "/usr/local/bin/omni-gemini-web2api"]
