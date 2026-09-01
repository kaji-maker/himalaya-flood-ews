import os
from pydantic_settings import BaseSettings
from pydantic import Field


class WorkerConfig(BaseSettings):
    DATABASE_URL: str = Field(
        default="postgresql://ews_admin:ews_secure_password@localhost:5432/himalaya_ews",
        description="PostGIS database connection URI"
    )
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis queue / cache URI"
    )
    STAC_API_URL: str = Field(
        default="https://planetarycomputer.microsoft.com/api/stac/v1",
        description="Planetary Computer or CDSE STAC Endpoint"
    )
    NASA_EARTHDATA_TOKEN: str = Field(
        default="",
        description="NASA Earthdata Bearer Token for GPM IMERG"
    )
    ALERT_SERVER_WEBHOOK: str = Field(
        default="http://localhost:4000/api/v1/alerts/evaluate",
        description="Core API alert evaluation endpoint"
    )
    DEFAULT_UTM_EPSG: int = Field(
        default=32645,
        description="Target Projected CRS for Nepal / Eastern Himalaya (UTM 45N)"
    )
    MAX_CLOUD_COVER_PCT: float = Field(
        default=35.0,
        description="Maximum scene cloud cover threshold"
    )
    MNDWI_WATER_THRESHOLD: float = Field(
        default=0.05,
        description="Threshold for MNDWI water pixel segmentation"
    )
    POLL_INTERVAL_SECONDS: int = Field(
        default=300,
        description="Telemetry polling frequency in seconds"
    )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = WorkerConfig()
