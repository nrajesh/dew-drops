import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MultiSelectPopoverProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}

export function MultiSelectPopover({ value: selected, onChange, suggestions, placeholder = "Select tags..." }: MultiSelectPopoverProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (tag: string) => {
    if (!selected.includes(tag)) {
      onChange([...selected, tag]);
    }
  };

  const handleUnselect = (tag: string) => {
    onChange(selected.filter((s) => s !== tag));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start font-normal h-auto min-h-10">
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((tag) => (
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
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found. You can create new tags by typing them in the old input field.</CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  value={suggestion}
                  onSelect={() => {
                    handleSelect(suggestion);
                  }}
                  className={cn(
                    "cursor-pointer",
                    selected.includes(suggestion) && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={selected.includes(suggestion)}
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