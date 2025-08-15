import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "./ui/input";

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
}

export const TagInput = ({ value, onChange, suggestions }: TagInputProps) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const [currentWord, setCurrentWord] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastCommaIndex = textBeforeCursor.lastIndexOf(',');
    const currentTagFragment = textBeforeCursor.substring(lastCommaIndex + 1).trim();
    
    if (currentTagFragment) {
      setCurrentWord(currentTagFragment);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    const tags = inputValue.split(',').map(t => t.trim());
    tags.pop(); // remove the current partial tag
    tags.push(suggestion); // add the selected full tag
    const newValue = tags.join(', ') + ', ';
    
    setInputValue(newValue);
    onChange(newValue);
    setOpen(false);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(currentWord.toLowerCase()) &&
    !inputValue.split(',').map(t => t.trim()).includes(s)
  );

  return (
    <Popover open={open && filteredSuggestions.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder="e.g., react, javascript, webdev"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No tag found.</CommandEmpty>
            <CommandGroup>
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => handleSuggestionSelect(suggestion)}
                >
                  {suggestion}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};