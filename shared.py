import queue

# Thread-safe bridge between the sync LogClassifier loop and the async API broadcaster.
alert_queue: "queue.Queue[dict]" = queue.Queue()
