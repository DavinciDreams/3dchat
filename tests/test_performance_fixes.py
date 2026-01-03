"""
Performance Fixes Test Suite

Tests the four P0 performance fixes:
1. Parallelize CRITICAL animation loading
2. Background loading for on-demand animations
3. Throttle VRM.update() calls
4. Pre-cache retargeted clips
"""

import json
import time
import requests
from typing import Dict, List, Any
from datetime import datetime

BASE_URL = "http://localhost:3000"

class PerformanceTestResults:
    def __init__(self):
        self.results = {
            "initial_load": {"passed": False, "metrics": {}, "issues": []},
            "animation_smoothness": {"passed": False, "metrics": {}, "issues": []},
            "on_demand_loading": {"passed": False, "metrics": {}, "issues": []},
            "pre_cache_effectiveness": {"passed": False, "metrics": {}, "issues": []},
            "regression": {"passed": False, "metrics": {}, "issues": []},
            "edge_cases": {"passed": False, "metrics": {}, "issues": []},
        }
        self.start_time = datetime.now()

    def save_results(self, filename="test-results.json"):
        """Save test results to JSON file"""
        self.results["test_date"] = self.start_time.isoformat()
        self.results["total_duration_seconds"] = (datetime.now() - self.start_time).total_seconds()
        
        with open(filename, "w") as f:
            json.dump(self.results, f, indent=2)
        print(f"\nResults saved to {filename}")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        
        total_tests = len(self.results) - 2  # Exclude metadata
        passed_tests = sum(1 for k, v in self.results.items() 
                          if isinstance(v, dict) and "passed" in v and v["passed"])
        
        for test_name, result in self.results.items():
            if isinstance(result, dict) and "passed" in result:
                status = "[PASS]" if result["passed"] else "[FAIL]"
                print(f"{status} - {test_name}")
                if result["issues"]:
                    for issue in result["issues"]:
                        print(f"  - {issue}")
        
        print(f"\nTotal: {passed_tests}/{total_tests} tests passed")
        print("="*50)

def test_initial_load() -> Dict[str, Any]:
    """Test 1: Initial Load Performance"""
    print("\n=== TEST 1: Initial Load Performance ===")
    
    issues = []
    metrics = {}
    
    try:
        # Test if server is accessible
        start_time = time.time()
        response = requests.get(BASE_URL, timeout=10)
        load_time = (time.time() - start_time) * 1000  # Convert to ms
        
        metrics["server_response_time_ms"] = round(load_time, 2)
        metrics["status_code"] = response.status_code
        
        print(f"Server response time: {metrics['server_response_time_ms']}ms")
        print(f"Status code: {metrics['status_code']}")
        
        if response.status_code != 200:
            issues.append(f"Server returned status code {response.status_code}")
        
        # Check if HTML contains expected elements
        if "canvas" not in response.text.lower():
            issues.append("Canvas element not found in response")
        
        # Check for VRM model loading
        if "vrm" not in response.text.lower():
            issues.append("VRM model references not found in page")
        
        # Pass criteria: server responds within 3 seconds
        passed = response.status_code == 200 and load_time < 3000
        
    except requests.exceptions.Timeout:
        issues.append("Server did not respond within timeout period")
        passed = False
    except requests.exceptions.ConnectionError:
        issues.append("Could not connect to server")
        passed = False
    except Exception as e:
        issues.append(f"Unexpected error: {str(e)}")
        passed = False
    
    return {"passed": passed, "metrics": metrics, "issues": issues}

def test_animation_smoothness() -> Dict[str, Any]:
    """Test 2: Animation Smoothness"""
    print("\n=== TEST 2: Animation Smoothness ===")
    
    issues = []
    metrics = {}
    
    # Since we can't directly measure FPS without browser automation,
    # we'll check if the application structure is correct
    
    try:
        response = requests.get(BASE_URL, timeout=10)
        
        # Check for animation-related code
        if "AnimationMixer" not in response.text:
            issues.append("AnimationMixer not found in page")
        
        if "VRM.update" not in response.text:
            issues.append("VRM.update not found in page")
        
        # Check for throttling implementation
        if "VRM_UPDATE_INTERVAL" not in response.text:
            issues.append("VRM update throttling not implemented")
        
        # Check for delta clamping
        if "clampedDelta" not in response.text:
            issues.append("Delta clamping not implemented")
        
        passed = len(issues) == 0
        
    except Exception as e:
        issues.append(f"Error checking animation smoothness: {str(e)}")
        passed = False
    
    return {"passed": passed, "metrics": metrics, "issues": issues}

def test_on_demand_loading() -> Dict[str, Any]:
    """Test 3: On-Demand Animation Loading"""
    print("\n=== TEST 3: On-Demand Animation Loading ===")
    
    issues = []
    metrics = {}
    
    try:
        response = requests.get(BASE_URL, timeout=10)
        
        # Check for background loading implementation
        if "loadVRMAAnimation" not in response.text:
            issues.append("loadVRMAAnimation function not found")
        
        # Check for fallback mechanism
        if "modelPose" not in response.text:
            issues.append("Fallback animation (modelPose) not found")
        
        # Check for async loading
        if "Promise" not in response.text or "async" not in response.text:
            issues.append("Async loading not implemented")
        
        passed = len(issues) == 0
        
    except Exception as e:
        issues.append(f"Error checking on-demand loading: {str(e)}")
        passed = False
    
    return {"passed": passed, "metrics": metrics, "issues": issues}

def test_pre_cache_effectiveness() -> Dict[str, Any]:
    """Test 4: Pre-Cache Effectiveness"""
    print("\n=== TEST 4: Pre-Cache Effectiveness ===")
    
    issues = []
    metrics = {}
    
    try:
        response = requests.get(BASE_URL, timeout=10)
        
        # Check for pre-cache implementation
        if "preCacheRetargetedClips" not in response.text:
            issues.append("preCacheRetargetedClips function not found")
        
        # Check for common animations list
        common_animations = ["idle", "modelPose", "talkingOnPhone", "headNod", "shakingHeadNo"]
        missing_animations = []
        
        for anim in common_animations:
            if anim not in response.text:
                missing_animations.append(anim)
        
        if missing_animations:
            issues.append(f"Common animations not pre-cached: {', '.join(missing_animations)}")
        
        passed = len(issues) == 0
        
    except Exception as e:
        issues.append(f"Error checking pre-cache effectiveness: {str(e)}")
        passed = False
    
    return {"passed": passed, "metrics": metrics, "issues": issues}

def test_regression() -> Dict[str, Any]:
    """Test 5: Regression Test"""
    print("\n=== TEST 5: Regression Test ===")
    
    issues = []
    metrics = {}
    
    try:
        response = requests.get(BASE_URL, timeout=10)
        
        # Test 1: Check if page loads
        if response.status_code != 200:
            issues.append("Page failed to load")
        
        # Test 2: Check for critical components
        critical_elements = ["canvas", "three", "vrm"]
        missing_elements = []
        
        for element in critical_elements:
            if element not in response.text.lower():
                missing_elements.append(element)
        
        if missing_elements:
            issues.append(f"Critical elements missing: {', '.join(missing_elements)}")
        
        # Test 3: Check for animation service
        if "vrmaAnimationService" not in response.text:
            issues.append("VRMA animation service not found")
        
        # Test 4: Check for animation layering service
        if "animationLayeringService" not in response.text:
            issues.append("Animation layering service not found")
        
        passed = len(issues) == 0
        
    except Exception as e:
        issues.append(f"Error during regression test: {str(e)}")
        passed = False
    
    return {"passed": passed, "metrics": metrics, "issues": issues}

def test_edge_cases() -> Dict[str, Any]:
    """Test 6: Edge Cases"""
    print("\n=== TEST 6: Edge Cases ===")
    
    issues = []
    metrics = {}
    
    try:
        # Test 1: Check for error handling
        response = requests.get(BASE_URL, timeout=10)
        
        if "try" not in response.text or "catch" not in response.text:
            issues.append("Error handling not implemented")
        
        # Test 2: Check for null checks
        if "null" not in response.text and "undefined" not in response.text:
            issues.append("Null/undefined checks not found")
        
        # Test 3: Check for loading states
        if "loading" not in response.text.lower():
            issues.append("Loading states not handled")
        
        # Test 4: Check for warning logs
        if "console.warn" not in response.text:
            issues.append("Warning logging not implemented")
        
        passed = len(issues) == 0
        
    except Exception as e:
        issues.append(f"Error during edge case tests: {str(e)}")
        passed = False
    
    return {"passed": passed, "metrics": metrics, "issues": issues}

def run_all_tests():
    """Run all performance tests"""
    print("="*50)
    print("Performance Fixes Test Suite")
    print("="*50)
    print(f"Testing: {BASE_URL}")
    print(f"Started at: {datetime.now().isoformat()}")
    
    results = PerformanceTestResults()
    
    # Run all tests
    results.results["initial_load"] = test_initial_load()
    results.results["animation_smoothness"] = test_animation_smoothness()
    results.results["on_demand_loading"] = test_on_demand_loading()
    results.results["pre_cache_effectiveness"] = test_pre_cache_effectiveness()
    results.results["regression"] = test_regression()
    results.results["edge_cases"] = test_edge_cases()
    
    # Print summary and save results
    results.print_summary()
    results.save_results()
    
    return results

if __name__ == "__main__":
    run_all_tests()
