from collections import Counter

def shannon_fano_split(char_freqs):
    """
    Recursively splits the character-frequency list into halves.
    Assigns '0' to the left side and '1' to the right side.
    """
    # Base case: if list is fully partitioned down to a single element
    if len(char_freqs) <= 1:
        return
    
    # Calculate the total frequency sum of the current partition
    total_sum = sum(freq for char, freq, code in char_freqs)
    
    best_diff = float('inf')
    split_index = 1
    current_left_sum = 0
    
    # Find the split-point index that minimizes the difference in sum 
    # between the left partition and right partition.
    for i in range(len(char_freqs) - 1):
        current_left_sum += char_freqs[i][1]
        right_sum = total_sum - current_left_sum
        diff = abs(current_left_sum - right_sum)
        
        # If the difference is the smallest we've seen, this is our best split line
        if diff < best_diff:
            best_diff = diff
            split_index = i + 1
            
    # Assign '0' to characters on the left half
    for i in range(split_index):
        char_freqs[i][2] += "0"
        
    # Assign '1' to characters on the right half
    for i in range(split_index, len(char_freqs)):
        char_freqs[i][2] += "1"
        
    # Recursively continue splitting both partitions top-down
    shannon_fano_split(char_freqs[:split_index])
    shannon_fano_split(char_freqs[split_index:])


def shannon_fano_encode(text):
    if not text:
        return "", {}
    
    frequencies = Counter(text)
    
    # Create List of mutable variables: [character, frequency, initializing empty boolean_code]
    char_freqs = [[char, freq, ""] for char, freq in frequencies.items()]
    
    # Shannon-Fano rule 1: Sort by frequency in descending order
    char_freqs.sort(key=lambda item: item[1], reverse=True)
    
    if len(char_freqs) == 1:
        return "0" * len(text), {text[0]: "0"}
        
    # Trigger the split process
    shannon_fano_split(char_freqs)
    
    # Store mapping results into dictionary 
    codes = {char: code for char, freq, code in char_freqs}
    
    encoded_text = "".join(codes[char] for char in text)
    return encoded_text, codes
