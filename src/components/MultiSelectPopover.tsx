import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { normalizeTag } from "@/lib/utils"; // Import normalizeTag

interface MultiSelectPopoverProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  canCreate?: boolean;
}

export function MultiSelectPopover({
  value: selected,
  onChange,
  suggestions,
  placeholder = "Select or create tags...",
  canCreate = true,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (tag: string) => {
    const normalizedTag = normalizeTag(tag);
    if (!selected.includes(normalizedTag)) {
      onChange([...selected, normalizedTag]);
    }
    setInputValue(""); // Clear input after selection
  };

  const handleCreate = (tag: string) => {
    const newTag = normalizeTag(tag);
    if (newTag && !selected.includes(newTag)) {
      onChange([...selected, newTag]);
    }
    setInputValue(""); // Clear input after creation
  };

  const handleUnselect = (tag: string) => {
    onChange(selected.filter((s) => s !== tag)); // 'tag' here is already normalized from 'selected'
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!canCreate) return;

    if (e.key === "Enter" && inputValue) {
      // If there are no suggestions and no explicit "create" option,
      // then the user is in the "empty" state and wants to create the tag.
      if (filteredSuggestions.length === 0 && !showCreateOption) {
        e.preventDefault();
        handleCreate(inputValue);
      }
      // Otherwise, we do nothing and let cmdk handle the Enter key,
      // which will trigger onSelect for the highlighted item.
    } else if (e.key === "," && inputValue) {
      // The comma key should always create a tag.
      e.preventDefault();
      handleCreate(inputValue);
    }
  };

  const normalizedInputValue = normalizeTag(inputValue);
  const normalizedSuggestions = suggestions.map(normalizeTag);
  const normalizedSelected = selected.map(normalizeTag); // Ensure selected tags are also normalized for comparison

  const filteredSuggestions = normalizedSuggestions.filter(
    (suggestion) =>
      !normalizedSelected.includes(suggestion) &&
      suggestion.toLowerCase().includes(normalizedInputValue.toLowerCase())
  );

  const showCreateOption = canCreate && normalizedInputValue && !normalizedSuggestions.some(s => s.toLowerCase() === normalizedInputValue.toLowerCase()) && !normalizedSelected.includes(normalizedInputValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start font-normal h-auto min-h-10"
          onClick={() => setOpen(true)}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((tag) => ( // Display original selected tag
                <Badge
                  key={tag}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(tag);
                  }}
                >
                  {tag}
                  <X className="ml-1 h-3 w-3 cursor-pointer" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput
            placeholder="Search or create..."
            value={inputValue} // Keep original inputValue for display
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue && canCreate ? `Press Enter to create "${inputValue}"` : "No tags found."}
            </CommandEmpty>
            <CommandGroup>
              {showCreateOption && (
                <CommandItem
                  value={normalizedInputValue} // Use normalized for internal value
                  onSelect={() => handleCreate(inputValue)}
                  className="cursor-pointer"
                >
                  Create "{inputValue}"
                </CommandItem>
              )}
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => {
                    handleSelect(suggestion);
                  }}
                  className="cursor-pointer"
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
}