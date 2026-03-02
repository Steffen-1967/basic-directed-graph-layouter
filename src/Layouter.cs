using System;
using System.Collections.Generic;
using System.Linq;

public class Layouter
{
    List<ProcessItem> AllItems {get; set;} = new List<ProcessItem>();
    Dictionary<int, int> MainDirectionOffsets {get; set;} = new Dictionary<int, int>();
    Dictionary<int, int> ItemsPerMainDirectionOffset {get; set;} = new Dictionary<int, int>();
    int orthoDirectionBaseOffset = 0;

    public void Calculate(List<ProcessItem> allItems)
    {
        AllItems = allItems;
        var startItems = AllItems.Where(i => i.PredecessorIds == null || i.PredecessorIds.Count == 0).ToList();

        if (startItems.Count == 0 && AllItems.Count > 0)
        {
            startItems.Add(AllItems[0]);
        }

        var remainingItems = new List<ProcessItem>();
        remainingItems.AddRange(AllItems.Where(i => !startItems.Contains(i)));

        foreach (var item in startItems)
        {
            orthoDirectionBaseOffset = CalculatePathFromStartItem(item, remainingItems) + 1;
        }
    }

    public int CalculatePathFromStartItem(ProcessItem startItem, List<ProcessItem> remainingItems)
    {
        var orderedItems = new List<ProcessItem>();
        orderedItems.Add(startItem);
        orderedItems.AddRange(remainingItems);
        foreach (int key in ItemsPerMainDirectionOffset.Keys.ToList())
        {
            ItemsPerMainDirectionOffset[key] = 0;
        }

        int orthoDirectionMaxOffset = 0;

        for (var loop = 0; loop < 2; loop++)
        {
            var processedItems = new List<ProcessItem>();
            foreach (var item in orderedItems)
            {
                int predecessorId = -1;
                if (loop == 0)
                {
                    predecessorId = item.PredecessorIds != null && item.PredecessorIds.Count > 0 ? item.PredecessorIds[0] : -1;
                }
                else if (item.PredecessorIds != null && item.PredecessorIds.Count > 1)
                {
                    foreach (var pId in item.PredecessorIds)
                    {
                        if (!remainingItems.Any(i => i.Id == pId))
                        {
                            predecessorId = pId;
                            break;
                        }
                    }
                }

                if (item != startItem && predecessorId == -1)
                    continue;

                item.Width = 150;
                item.Height = 60;

                int mainDirectionOffset = (MainDirectionOffsets.ContainsKey(predecessorId) ? MainDirectionOffsets[predecessorId] + 1 : 0);
                MainDirectionOffsets[item.Id] = mainDirectionOffset;

                if (!ItemsPerMainDirectionOffset.ContainsKey(mainDirectionOffset))
                {
                    ItemsPerMainDirectionOffset[mainDirectionOffset] = 0;
                }
                int orthoDirectionOffset = ItemsPerMainDirectionOffset[mainDirectionOffset];
                ItemsPerMainDirectionOffset[mainDirectionOffset]++;

                item.X = (mainDirectionOffset * 220) + 50; 
                item.Y = ((orthoDirectionBaseOffset + orthoDirectionOffset) * 120) + 50;

                orthoDirectionMaxOffset = Math.Max(orthoDirectionMaxOffset, orthoDirectionBaseOffset + orthoDirectionOffset);
                processedItems.Add(item);
                remainingItems.Remove(item);
            }
            foreach (var processedItem in processedItems)
                orderedItems.Remove(processedItem);
        }
        Console.WriteLine($"Baseoffset '{orthoDirectionBaseOffset}', Offset '{orthoDirectionMaxOffset}', Count '{remainingItems.Count}'.");
        return orthoDirectionMaxOffset;
    }
}
