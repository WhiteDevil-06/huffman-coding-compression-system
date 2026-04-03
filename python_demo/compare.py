import sys
from huffman import huffman_encode
from shannon_fano import shannon_fano_encode

def print_separator():
    print("-" * 65)

def main():
    print("\n" + "=" * 65)
    print(" HUFFMAN VS SHANNON-FANO COMPRESSION ALGORITHM BENCHMARK")
    print("=" * 65)
    
    # Use a mathematical edge case string if no custom text is provided via terminal.
    # This specific frequency distribution (A:15, B:7, C:6, D:6, E:5) forces Shannon-Fano 
    # to make a sub-optimal split, proving Huffman's tree is better.
    text = "AAAAAAAAAAAAAAABBBBBBBCCCCCCDDDDDDEEEEE"
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
        
    print(f"\nOriginal Input Text:\n\"{text}\"")
    
    # Calculate original bit size (standard ASCII is 8 bits per character)
    original_bits = len(text) * 8
    print(f"\nOriginal Size (8-bit ASCII): {original_bits} bits")
    
    print_separator()
    
    # ----------------------------------------------------
    # RUN 1: HUFFMAN CODING (Bottom-Up, Optimal)
    # ----------------------------------------------------
    huff_encoded, huff_codes = huffman_encode(text)
    huff_bits = len(huff_encoded)
    huff_savings = ((original_bits - huff_bits) / original_bits) * 100
    
    print("\n[ ALGORITHM 1: HUFFMAN CODING ]")
    print(f"Codes: {huff_codes}")
    print(f"Compressed Size: {huff_bits} bits")
    print(f"Compression Savings: {huff_savings:.2f}% space saved")
    
    print_separator()
    
    # ----------------------------------------------------
    # RUN 2: SHANNON-FANO CODING (Top-Down, Sub-Optimal)
    # ----------------------------------------------------
    sf_encoded, sf_codes = shannon_fano_encode(text)
    sf_bits = len(sf_encoded)
    sf_savings = ((original_bits - sf_bits) / original_bits) * 100
    
    print("\n[ ALGORITHM 2: SHANNON-FANO CODING ]")
    print(f"Codes: {sf_codes}")
    print(f"Compressed Size: {sf_bits} bits")
    print(f"Compression Savings: {sf_savings:.2f}% space saved")
    
    print_separator()
    
    # ----------------------------------------------------
    # MATHEMATICAL COMPARISON
    # ----------------------------------------------------
    print("\n🏆 THE CONCLUSION 🏆")
    if huff_bits < sf_bits:
        diff_bits = sf_bits - huff_bits
        diff_percent = ((sf_bits - huff_bits) / sf_bits) * 100
        print(f"Huffman Coding wins!")
        print(f"Because Huffman builds bottom-up greedily, it required {diff_bits} fewer bits to encode the text compared to Shannon-Fano.")
        print(f"(Huffman is roughly {diff_percent:.2f}% more efficient than Shannon-Fano for this specific text)\n")
    elif sf_bits < huff_bits:
        # Theoretically, Shannon fano shouldn't ever beat Huffman, this is in an absolute edge case fail-safe
        print("Shannon-Fano wins! (This occurs only due to extremely rare mathematically identical edge cases).\n")
    else:
        print("It's a tie! Both algorithms produced the exact same bit length for this text.")
        print("Since both rely on tree-based character frequencies, they occasionally perform identically on uniform inputs.")
        print("However, Huffman mathematically guarantees the absolute most optimal possible tree, whereas Shannon-Fano can occasionally fall short on complex inputs.\n")

if __name__ == "__main__":
    main()
