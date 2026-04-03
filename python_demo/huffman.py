import heapq
from collections import Counter

class Node:
    def __init__(self, char, freq):
        self.char = char
        self.freq = freq
        self.left = None
        self.right = None

    # Define a less-than method to allow the heapq to properly sort the Nodes
    def __lt__(self, other):
        return self.freq < other.freq

def build_huffman_tree(text):
    """
    Builds the optimal Huffman Tree using an optimal 'greedy' bottom-up approach.
    """
    if not text:
        return None
        
    frequencies = Counter(text)
    
    # 1. Create a forest of single-node trees (one for each character) and heapify them.
    heap = [Node(char, freq) for char, freq in frequencies.items()]
    heapq.heapify(heap)

    # 2. Iterate until there is only 1 tree left in the heap
    while len(heap) > 1:
        # Extract the two nodes with the lowest frequencies
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        
        # Merge them into a single parent node
        merged = Node(None, left.freq + right.freq)
        merged.left = left
        merged.right = right
        
        heapq.heappush(heap, merged)

    # Return the root node of the final Huffman tree
    return heap[0]

def generate_huffman_codes(node, current_code="", codes={}):
    """
    Traverses the tree to generate the prefix codes.
    """
    if node is None:
        return
        
    if node.char is not None:
        codes[node.char] = current_code
        
    # Traverse left means adding a '0'
    generate_huffman_codes(node.left, current_code + "0", codes)
    # Traverse right means adding a '1'
    generate_huffman_codes(node.right, current_code + "1", codes)
    return codes

def huffman_encode(text):
    if not text:
        return "", {}
        
    # Edge case handler for strings with only 1 unique repeating letter
    if len(set(text)) == 1:
        return "0" * len(text), {text[0]: "0"}
        
    root = build_huffman_tree(text)
    codes = {}
    generate_huffman_codes(root, "", codes)
    
    encoded_text = "".join(codes[char] for char in text)
    return encoded_text, codes
