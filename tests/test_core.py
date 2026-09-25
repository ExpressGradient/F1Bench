import copy
import math
import unittest

from f1bench.core import BenchError, prediction_template, score_prediction, validate_prediction


EVENT = {
    "id": "test-gp",
    "name": "Test GP",
    "season": 2026,
    "round": 1,
    "drivers": [{"id": "AAA", "name": "A"}, {"id": "BBB", "name": "B"}],
}
PREDICTION = {
    "event_id": "test-gp",
    "drivers": {
        "AAA": {
            "positions": [0.75, 0.2],
            "nc": 0.04,
            "dns": 0.01,
            "dsq": 0.0,
            "retirement": 0.1,
        },
        "BBB": {
            "positions": [0.25, 0.7],
            "nc": 0.04,
            "dns": 0.01,
            "dsq": 0.0,
            "retirement": 0.1,
        },
    },
}


class CoreTests(unittest.TestCase):
    def test_valid_distribution_and_score(self):
        validate_prediction(PREDICTION, EVENT)
        result = {
            "event_id": "test-gp",
            "results": [
                {"driver_id": "AAA", "position": 1, "status": "classified", "retired": False},
                {"driver_id": "BBB", "position": 2, "status": "classified", "retired": False},
            ]
        }
        score = score_prediction(PREDICTION, result, EVENT)
        self.assertAlmostEqual(score["mean_log_loss"], -(math.log(0.75) + math.log(0.7)) / 2)

    def test_rejects_incoherent_columns(self):
        drivers = copy.deepcopy(PREDICTION["drivers"])
        drivers["AAA"]["positions"] = [0.8, 0.15]
        drivers["BBB"]["positions"] = [0.4, 0.55]
        prediction = PREDICTION | {"drivers": drivers}
        with self.assertRaises(BenchError):
            validate_prediction(prediction, EVENT)

    def test_template_has_only_null_probabilities(self):
        template = prediction_template(EVENT)
        self.assertEqual(set(template), {"event_id", "drivers"})
        self.assertEqual(template["drivers"]["AAA"]["positions"], [None, None])

    def test_rejects_non_probability_output(self):
        with self.assertRaises(BenchError):
            validate_prediction(PREDICTION | {"sources": []}, EVENT)


if __name__ == "__main__":
    unittest.main()
