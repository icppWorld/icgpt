"""Helper functions for candid"""

import json
from typing import Any, Dict


def dict_to_text(d: Dict[Any, Any]) -> str:
    """Serialized dict into Candid text to send over the wire"""
    # pull it through twice, so all " are escaped into \"
    return json.dumps(json.dumps(d))


##    return json.dumps(d)
