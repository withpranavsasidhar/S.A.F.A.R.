import sys
import os

# Make the backend/ directory root importable as 'app.*'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
