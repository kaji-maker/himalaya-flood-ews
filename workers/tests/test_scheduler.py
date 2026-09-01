import pytest
from unittest.mock import patch, MagicMock
from src.ingestion.scheduler import IngestionDaemon, PRIORITY_LAKES


def test_daemon_initialization():
    daemon = IngestionDaemon(api_base_url="http://localhost:4000/api/v1")
    assert daemon.api_base_url == "http://localhost:4000/api/v1"
    assert daemon.s2_client is not None
    assert daemon.gpm_client is not None
    assert daemon.mndwi_extractor is not None


def test_process_single_lake_mock_api():
    daemon = IngestionDaemon(api_base_url="http://localhost:4000/api/v1")
    test_lake = PRIORITY_LAKES[0]  # Tsho Rolpa

    with patch("httpx.Client.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "success": True,
            "data": {
                "observation": {"id": "obs-1", "area_sqm": 1600000.0},
                "alert_triggered": False,
                "alert": None
            }
        }
        mock_post.return_value = mock_response

        result = daemon.process_single_lake(test_lake)

        assert result["success"] is True
        assert mock_post.called
        # Verify payload sent to API
        call_kwargs = mock_post.call_args[1]
        payload = call_kwargs["json"]
        assert payload["lake_id"] == test_lake["icimod_code"]
        assert payload["area_sqm"] > 0
        assert "mean_mndwi" in payload
        assert "precip_48h_mm" in payload


def test_run_ingestion_cycle():
    daemon = IngestionDaemon(api_base_url="http://localhost:4000/api/v1")
    subset_lakes = PRIORITY_LAKES[:2]

    with patch("httpx.Client.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"success": True, "data": {"alert_triggered": False}}
        mock_post.return_value = mock_response

        results = daemon.run_ingestion_cycle(lakes=subset_lakes)
        assert len(results) == 2
        assert mock_post.call_count == 2
