import requests
import json
import os
from typing import Dict, Any, List, Union

# HTTP status codes that mean the current key's quota is exhausted.
_QUOTA_ERRORS = {402, 429}


class SpoonacularAPI:
    """Client for the Spoonacular API with automatic key rotation on quota errors."""

    BASE_URL = "https://api.spoonacular.com"

    def __init__(self, api_keys: Union[str, List[str]]):
        if isinstance(api_keys, str):
            api_keys = [api_keys]
        self._keys = [k for k in api_keys if k]
        if not self._keys:
            raise ValueError("No Spoonacular API keys provided.")
        self._key_index = 0
        self._sync_key()

    def _sync_key(self):
        self.api_key = self._keys[self._key_index]
        self.headers = {"Content-Type": "application/json", "x-api-key": self.api_key}

    def _rotate_key(self) -> bool:
        """Advance to the next key. Returns False when all keys are exhausted."""
        if self._key_index + 1 < len(self._keys):
            self._key_index += 1
            self._sync_key()
            print(f"[SpoonacularAPI] Rotated to key #{self._key_index + 1} of {len(self._keys)}")
            return True
        print("[SpoonacularAPI] All API keys exhausted.")
        return False

    def _get(self, endpoint: str, params: dict) -> requests.Response:
        """GET with automatic key rotation on 402/429."""
        while True:
            params["apiKey"] = self.api_key
            response = requests.get(endpoint, params=params, timeout=15)
            if response.status_code in _QUOTA_ERRORS:
                print(f"[SpoonacularAPI] Key #{self._key_index + 1} quota exceeded "
                      f"(HTTP {response.status_code})")
                if not self._rotate_key():
                    raise RuntimeError(
                        "All Spoonacular API keys have exceeded their quota. "
                        "Try again tomorrow or add more keys to .env."
                    )
                continue
            response.raise_for_status()
            return response

    def _save_to_json(self, data: Union[Dict, List], filename: str) -> None:
        if not filename.endswith('.json'):
            filename += '.json'
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"Results saved to '{filename}'")
        except IOError as e:
            print(f"Error saving file: {e}")

    def search_recipes_complex(self, save_to: str = None, **kwargs) -> Dict[str, Any]:
        endpoint = f"{self.BASE_URL}/recipes/complexSearch"
        params = {}
        params.update(kwargs)
        try:
            data = self._get(endpoint, params).json()
            if save_to:
                self._save_to_json(data, save_to)
            return data
        except RuntimeError:
            raise
        except requests.exceptions.RequestException as e:
            print(f"Error in complexSearch request: {e}")
            return {}

    def get_recipe_information(self, recipe_id: int, save_to: str = None, **kwargs) -> Dict[str, Any]:
        endpoint = f"{self.BASE_URL}/recipes/{recipe_id}/information"
        params = {"includeNutrition": False}
        params.update(kwargs)
        try:
            data = self._get(endpoint, params).json()
            if save_to:
                self._save_to_json(data, save_to)
            return data
        except RuntimeError:
            raise
        except requests.exceptions.RequestException as e:
            print(f"Error in get_recipe_information for ID {recipe_id}: {e}")
            return {}
